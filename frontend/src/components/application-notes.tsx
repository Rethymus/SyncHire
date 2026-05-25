"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logger, LogCategory } from "@/lib/logger";
import { applicationAPI } from "@/lib/api-client-consolidated";
import {
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface ApplicationNotesProps {
  applicationId: string;
  initialNotes?: string;
  onNotesUpdate?: (notes: string) => void;
}

export function ApplicationNotes({
  applicationId,
  initialNotes = "",
  onNotesUpdate,
}: ApplicationNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const saveNotes = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const response = await applicationAPI.update(applicationId, {
        notes,
      });

      if (response.success) {
        setLastSaved(new Date());
        onNotesUpdate?.(notes);

        // Clear success message after 3 seconds
        setTimeout(() => setLastSaved(null), 3000);
      } else {
        setError(typeof response.error === 'string' ? response.error : "保存备注时发生错误");
      }
    } catch (err) {
      logger.error(LogCategory.API, "Failed to save notes", err as Error);
      setError("保存备注时发生错误");
    } finally {
      setSaving(false);
    }
  }, [applicationId, notes, onNotesUpdate]);

  const clearNotes = useCallback(() => {
    setNotes("");
    setError("");
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">申请备注</h3>
        </div>
        {lastSaved && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            已保存
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="application-notes">备注内容</Label>
          <Textarea
            id="application-notes"
            placeholder="添加关于此申请的备注，例如：&#10;- 面试时间和地点&#10;- 联系人信息&#10;- 重要注意事项&#10;- 后续跟进计划"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="mt-2 resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {notes.length > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {notes.length} 个字符
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {notes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearNotes}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空
              </Button>
            )}
            <Button
              onClick={saveNotes}
              disabled={saving || notes.trim() === initialNotes.trim()}
              size="sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存备注
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Notes Templates */}
        <div className="border-t pt-4">
          <Label className="text-sm text-gray-600 mb-2 block">快速添加</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toLocaleString();
                const newNote = notes ? `${notes}\n\n` : "";
                setNotes(`${newNote}[${timestamp}] 面试安排：\n- 时间：\n- 地点：\n- 联系人：\n- 备注：`);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              面试安排
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toLocaleString();
                const newNote = notes ? `${notes}\n\n` : "";
                setNotes(`${newNote}[${timestamp}] 后续跟进：\n- 任务：\n- 截止日期：\n- 备注：`);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              后续跟进
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toLocaleString();
                const newNote = notes ? `${notes}\n\n` : "";
                setNotes(`${newNote}[${timestamp}] 重要提醒：\n-`);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              重要提醒
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
