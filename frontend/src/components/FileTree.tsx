import { FileNode } from "../api/client";

type Props = {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
};

function TreeNode({
  node,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  if (node.type === "directory") {
    return (
      <div className="tree-group">
        <div className="tree-directory">{node.name}</div>
        <div className="tree-children">
          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      className={`tree-file ${selectedPath === node.path ? "active" : ""}`}
      onClick={() => onSelect(node.path)}
    >
      <span>{node.name}</span>
      <span className="file-size">{node.size ?? 0} B</span>
    </button>
  );
}

export function FileTree({ nodes, selectedPath, onSelect }: Props) {
  if (nodes.length === 0) {
    return <div className="empty-state">No files yet. The scan may still be running.</div>;
  }

  return (
    <div className="file-tree">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
