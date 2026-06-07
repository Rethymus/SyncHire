"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Trash2, RefreshCw, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToastMessage } from "@/hooks/use-toast";

interface DataManagementProps {
  userId: string;
}

type ExportType = "all" | "resumes" | "jds" | "applications";

export default function DataManagement({ userId }: DataManagementProps) {
  const toast = useToastMessage();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async (type: ExportType) => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const endpoints = {
        all: "/api/gdpr/data/export-full",
        resumes: "/api/export/resumes/csv",
        jds: "/api/export/jds/csv",
        applications: "/api/export/applications/csv",
      };

      const response = await fetch(endpoints[type], {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Export failed");

      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        setExportProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synchire_${type}_export_${new Date().toISOString()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export successful", `Your ${type} data has been exported successfully.`);
    } catch (error) {
      toast.error("Export failed", "There was an error exporting your data. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleAccountDeletion = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/gdpr/account/deletion-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          confirm: true,
          reason: "User requested deletion",
        }),
      });

      if (!response.ok) throw new Error("Deletion request failed");

      const data = await response.json();

      toast.success(
        "Deletion request submitted",
        `Your account will be deleted on ${new Date(data.scheduled_for).toLocaleDateString()}. You can cancel within 30 days.`
      );

      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error("Deletion request failed", "There was an error processing your request. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GDPR Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            GDPR Compliance Status
          </CardTitle>
          <CardDescription>
            Your data rights and protection status under GDPR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Right to Access</p>
                  <p className="text-sm text-muted-foreground">
                    You can export all your data at any time
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("all")}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Right to Rectification</p>
                  <p className="text-sm text-muted-foreground">
                    You can edit your profile and data at any time
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/profile">Edit Profile</Link>
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Right to Erasure</p>
                  <p className="text-sm text-muted-foreground">
                    You can request deletion of your account and data
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Request Deletion
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Right to Portability</p>
                  <p className="text-sm text-muted-foreground">
                    Export your data in machine-readable format
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("all")}
                disabled={isExporting}
              >
                Export All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download your data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Complete Data Export</h4>
                <p className="text-sm text-muted-foreground">
                  All your data in a structured ZIP archive
                </p>
              </div>
              <Button
                onClick={() => handleExport("all")}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Resumes (CSV)</h4>
                <p className="text-sm text-muted-foreground">
                  Your resume data in spreadsheet format
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExport("resumes")}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Job Descriptions (CSV)</h4>
                <p className="text-sm text-muted-foreground">
                  Your saved job descriptions
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExport("jds")}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Applications (CSV)</h4>
                <p className="text-sm text-muted-foreground">
                  Your application history and status
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExport("applications")}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {exportProgress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Export Progress</span>
                <span className="text-sm text-muted-foreground">
                  {exportProgress}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Account Deletion
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning: Irreversible Action</AlertTitle>
                <AlertDescription>
                  Deleting your account will permanently remove all your data,
                  including resumes, job descriptions, applications, and search
                  history. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>When you delete your account:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>All profile information will be removed</li>
                  <li>All resumes and uploaded files will be deleted</li>
                  <li>All job descriptions will be removed</li>
                  <li>All applications and history will be deleted</li>
                  <li>You will lose access to all features</li>
                </ul>
              </div>

              <Button
                variant="destructive"
                onClick={handleAccountDeletion}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirm Account Deletion</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete your account? This action
                  cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleAccountDeletion}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Delete My Account
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                After confirmation, your account will be scheduled for deletion
                in 30 days. You can cancel this request within the grace period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Retention Information */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention Policy</CardTitle>
          <CardDescription>
            How long we keep your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>User profile data</span>
              <span className="font-medium">30 days after account deletion</span>
            </div>
            <div className="flex justify-between">
              <span>Resumes and CVs</span>
              <span className="font-medium">90 days after deletion</span>
            </div>
            <div className="flex justify-between">
              <span>Job descriptions</span>
              <span className="font-medium">2 years after creation</span>
            </div>
            <div className="flex justify-between">
              <span>Application history</span>
              <span className="font-medium">2 years after creation</span>
            </div>
            <div className="flex justify-between">
              <span>Search history</span>
              <span className="font-medium">1 year</span>
            </div>
            <div className="flex justify-between">
              <span>Analytics data</span>
              <span className="font-medium">1 year</span>
            </div>
            <div className="flex justify-between">
              <span>Backups</span>
              <span className="font-medium">90 days</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
