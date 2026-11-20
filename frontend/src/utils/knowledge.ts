import type { KnowledgeNode } from '../types'

export function findKnowledgeNode(
  nodes: KnowledgeNode[],
  key: string,
): KnowledgeNode | null {
  for (const node of nodes) {
    if (node.key === key) return node
    const found = findKnowledgeNode(node.children, key)
    if (found) return found
  }
  return null
}

export function flattenKnowledgeLeaves(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const leaves: KnowledgeNode[] = []
  const walk = (items: KnowledgeNode[]) => {
    items.forEach((node) => {
      if (node.children.length) walk(node.children)
      else if (node.knowledge_id) leaves.push(node)
    })
  }
  walk(nodes)
  return leaves
}

export function knowledgeNodeContains(node: KnowledgeNode, key: string): boolean {
  if (node.key === key) return true
  return node.children.some((child) => knowledgeNodeContains(child, key))
}
