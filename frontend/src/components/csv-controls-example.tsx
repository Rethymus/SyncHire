"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSVExportDialog } from "./csv-export-dialog";
import { CSVImportDialog } from "./csv-import-dialog";
import { FileDown, FileUp, Package, Briefcase, Users } from "lucide-react";

/**
 * CSVControlsExample
 *
 * This component demonstrates how to integrate CSV export/import functionality
 * into your SyncHire application. It provides controls for managing:
 * - Applications
 * - Resumes
 * - Job Descriptions
 *
 * Usage Example:
 * ```tsx
 * import { CSVControls } from "@/components/csv-controls-example";
 *
 * function MyPage() {
 *   return (
 *     <div>
 *       <h1>Data Management</h1>
 *       <CSVControls />
 *     </div>
 *   );
 * }
 * ```
 */
export function CSVControlsExample() {
  const [exportDialog, setExportDialog] = useState<{
    open: boolean;
    type: "applications" | "resumes" | "jds";
    name: string;
  }>({
    open: false,
    type: "applications",
    name: "Applications",
  });

  const [importDialog, setImportDialog] = useState<{
    open: boolean;
    type: "applications" | "resumes" | "jds";
    name: string;
  }>({
    open: false,
    type: "applications",
    name: "Applications",
  });

  const handleExport = (type: "applications" | "resumes" | "jds") => {
    const names = {
      applications: "Applications",
      resumes: "Resumes",
      jds: "Job Descriptions",
    };
    setExportDialog({
      open: true,
      type,
      name: names[type],
    });
  };

  const handleImport = (type: "applications" | "resumes" | "jds") => {
    const names = {
      applications: "Applications",
      resumes: "Resumes",
      jds: "Job Descriptions",
    };
    setImportDialog({
      open: true,
      type,
      name: names[type],
    });
  };

  const handleImportSuccess = () => {
    // Refresh data or show success notification
    console.log("Import completed successfully");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export your data to CSV files or import data from CSV files. This
            is useful for backups, data migration, or bulk editing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="applications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="resumes">Resumes</TabsTrigger>
              <TabsTrigger value="jds">Job Descriptions</TabsTrigger>
            </TabsList>

            {/* Applications Tab */}
            <TabsContent value="applications" className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="bg-primary/10 p-2 rounded">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Applications Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export or import your job application data including status,
                    match scores, notes, and tags.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("applications")}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImport("applications")}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Resumes Tab */}
            <TabsContent value="resumes" className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="bg-primary/10 p-2 rounded">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Resumes Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export or import your resume data including titles, skills,
                    experience, and education information.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("resumes")}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImport("resumes")}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Job Descriptions Tab */}
            <TabsContent value="jds" className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="bg-primary/10 p-2 rounded">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Job Descriptions Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export or import job description data including company
                    information, requirements, and salary details.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("jds")}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImport("jds")}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <CSVExportDialog
        open={exportDialog.open}
        onOpenChange={(open) =>
          setExportDialog({ ...exportDialog, open })
        }
        entityType={exportDialog.type}
        entityName={exportDialog.name}
      />

      {/* Import Dialog */}
      <CSVImportDialog
        open={importDialog.open}
        onOpenChange={(open) =>
          setImportDialog({ ...importDialog, open })
        }
        entityType={importDialog.type}
        entityName={importDialog.name}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}

/**
 * Integration Guide
 *
 * 1. Add CSV Controls to Your Pages:
 *
 * ```tsx
 * // In any page component (e.g., app/applications/page.tsx)
 * import { CSVControls } from "@/components/csv-controls-example";
 *
 * export default function ApplicationsPage() {
 *   return (
 *     <div>
 *       <div className="flex justify-between items-center">
 *         <h1>My Applications</h1>
 *         <CSVControls />
 *       </div>
 *       {/* Rest of your page content *\/}
 *     </div>
 *   );
 * }
 * ```
 *
 * 2. Add Export/Import Buttons to Action Bars:
 *
 * ```tsx
 * import { Button } from "@/components/ui/button";
 * import { FileDown, FileUp } from "lucide-react";
 * import { CSVExportDialog } from "@/components/csv-export-dialog";
 * import { CSVImportDialog } from "@/components/csv-import-dialog";
 *
 * function ActionBar() {
 *   const [showExport, setShowExport] = useState(false);
 *   const [showImport, setShowImport] = useState(false);
 *
 *   return (
 *     <>
 *       <div className="flex gap-2">
 *         <Button variant="outline" onClick={() => setShowExport(true)}>
 *           <FileDown className="mr-2 h-4 w-4" />
 *           Export
 *         </Button>
 *         <Button variant="outline" onClick={() => setShowImport(true)}>
 *           <FileUp className="mr-2 h-4 w-4" />
 *           Import
 *         </Button>
 *       </div>
 *
 *       <CSVExportDialog
 *         open={showExport}
 *         onOpenChange={setShowExport}
 *         entityType="applications"
 *         entityName="Applications"
 *       />
 *
 *       <CSVImportDialog
 *         open={showImport}
 *         onOpenChange={setShowImport}
 *         entityType="applications"
 *         entityName="Applications"
 *         onSuccess={() => {
 *           // Refresh data
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * 3. CSV File Format Reference:
 *
 * Applications CSV:
 * - id, status, match_score, notes, tags, created_at, updated_at, resume_title, jd_title, company_name
 *
 * Resumes CSV:
 * - id, title, file_name, skills, experience_years, education_level, created_at, updated_at
 *
 * JDs CSV:
 * - id, title, company_name, location, employment_type, skills_required, experience_required, salary_min, salary_max, created_at, updated_at
 *
 * 4. Error Handling:
 *
 * The components automatically handle errors and display user-friendly messages.
 * Import validation includes:
 * - Required field checking
 * - Duplicate detection (configurable: skip, update, error)
 * - Data type validation
 * - Foreign key validation (resumes/JDs must exist for applications)
 */