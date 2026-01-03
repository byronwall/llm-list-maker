export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  listCount: number;
  itemCount: number;
}

export interface List {
  id: string;
  projectId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  projectId: string;
  listId: string | null; // null => Loose
  label: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBoard {
  project: Project;
  lists: List[];
  items: Item[];
}
