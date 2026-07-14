"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, type Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ProjectsContextValue {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: number) => void;
  loading: boolean;
  reload: () => void;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

const ACTIVE_KEY = "ftj_active_project";

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    api.projects.list().then((list) => {
      setProjects(list);
      let active: Project | null = null;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(ACTIVE_KEY);
        const storedId = stored ? parseInt(stored, 10) : null;
        active = list.find((p) => p.id === storedId) || list[0] || null;
      } else {
        active = list[0] || null;
      }
      setActiveProject(active);
      if (active && typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_KEY, String(active.id));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) reload();
    else if (!user) {
      setProjects([]);
      setActiveProject(null);
      setLoading(false);
    }
  }, [user, reload]);

  const setActiveProjectId = useCallback((id: number) => {
    const p = projects.find((p) => p.id === id);
    if (p) {
      setActiveProject(p);
      if (typeof window !== "undefined") localStorage.setItem(ACTIVE_KEY, String(p.id));
    }
  }, [projects]);

  return (
    <ProjectsContext.Provider value={{ projects, activeProject, setActiveProjectId, loading, reload }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
