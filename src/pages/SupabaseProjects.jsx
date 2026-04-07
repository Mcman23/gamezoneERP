import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, AlertCircle } from "lucide-react";

export default function SupabaseProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getSupabaseProjects", {})
      .then(res => setProjects(res.data.projects || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-red-500 p-6">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Database className="w-6 h-6 text-purple-500" />
        Gaming Center Management Projects
      </h1>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card key={project.id} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="truncate">{project.name}</span>
                  <Badge variant={project.status === "ACTIVE_HEALTHY" ? "default" : "secondary"} className="ml-2 shrink-0 text-xs">
                    {project.status === "ACTIVE_HEALTHY" ? "Active" : project.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-500 space-y-1">
                <p><span className="font-medium text-gray-700">Region:</span> {project.region}</p>
                <p><span className="font-medium text-gray-700">Ref:</span> <code className="bg-gray-100 px-1 rounded text-xs">{project.ref}</code></p>
                <p><span className="font-medium text-gray-700">Created:</span> {new Date(project.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}