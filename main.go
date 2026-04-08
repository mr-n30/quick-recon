package main

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

/*
   Custom header flag (repeatable)
*/
type headerList []string

func (h *headerList) String() string {
	return strings.Join(*h, ", ")
}

func (h *headerList) Set(value string) error {
	*h = append(*h, value)
	return nil
}

func parseHeaders(hdrs []string) http.Header {
	headers := make(http.Header)

	for _, h := range hdrs {
		parts := strings.SplitN(h, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		if key != "" {
			headers.Add(key, val)
		}
	}

	return headers
}

/*
   UUID generator
*/
func newUUIDLike() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return time.Now().Format("20060102150405.000000000")
	}

	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80

	dst := make([]byte, 36)
	hex.Encode(dst[0:8], b[0:4])
	dst[8] = '-'
	hex.Encode(dst[9:13], b[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], b[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], b[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:36], b[10:16])

	return string(dst)
}

/*
   Helpers
*/
func sanitizeHost(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return "unknown"
	}
	return u.Hostname()
}

func commentPrefix(rawURL string, statusCode int, status string) string {
	return fmt.Sprintf(
		"// URL: %s\n// Domain: %s\n// Status: %d %s\n\n",
		rawURL,
		sanitizeHost(rawURL),
		statusCode,
		status,
	)
}

func isRelevantStatus(code int) bool {
	switch code {
	case 200, 201, 202, 204, 206,
		301, 302, 307, 308,
		401, 403, 405, 429,
		500, 502, 503:
		return true
	default:
		return false
	}
}

/*
   HTTP client
*/
func buildClient(proxyStr string) (*http.Client, error) {
	transport := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
	}

	if proxyStr != "" {
		p, err := url.Parse(proxyStr)
		if err != nil {
			return nil, err
		}
		transport.Proxy = http.ProxyURL(p)
	}

	return &http.Client{
		Timeout:   60 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}, nil
}

/*
   Worker
*/
func worker(client *http.Client, outDir string, headers http.Header, jobs <-chan string, wg *sync.WaitGroup) {
	defer wg.Done()

	for rawURL := range jobs {

		req, err := http.NewRequest("GET", rawURL, nil)
		if err != nil {
			continue
		}

		for k, vals := range headers {
			for _, v := range vals {
				req.Header.Add(k, v)
			}
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}

		if !isRelevantStatus(resp.StatusCode) {
			resp.Body.Close()
			continue
		}

		filename := filepath.Join(outDir, newUUIDLike()+".txt")

		f, err := os.Create(filename)
		if err != nil {
			resp.Body.Close()
			continue
		}

		f.WriteString(commentPrefix(rawURL, resp.StatusCode, resp.Status))
		io.Copy(f, resp.Body)

		resp.Body.Close()
		f.Close()
	}
}

/*
   Main
*/
func main() {
	var concurrency int
	var outDir string
	var proxyStr string
	var headers headerList

	flag.IntVar(&concurrency, "concurrency", 5, "number of concurrent requests")
	flag.IntVar(&concurrency, "c", 5, "shorthand concurrency")
	flag.StringVar(&outDir, "out", "responses", "output directory")
	flag.StringVar(&proxyStr, "proxy", "", "proxy URL (burp: http://127.0.0.1:8080)")
	flag.Var(&headers, "H", "custom header (repeatable)")

	flag.Parse()

	if concurrency < 1 {
		os.Exit(1)
	}

	os.MkdirAll(outDir, 0755)

	client, err := buildClient(proxyStr)
	if err != nil {
		os.Exit(1)
	}

	parsedHeaders := parseHeaders(headers)

	jobs := make(chan string)
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go worker(client, outDir, parsedHeaders, jobs, &wg)
	}

	scanner := bufio.NewScanner(os.Stdin)

	go func() {
		defer close(jobs)
		for scanner.Scan() {
			u := strings.TrimSpace(scanner.Text())
			if u != "" {
				jobs <- u
			}
		}
	}()

	wg.Wait()
}