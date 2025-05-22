"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LogoutDialogProps {
  showLogoutDialog: boolean;
  setShowLogoutDialog: (show: boolean) => void;
  completeLabEnd: () => void;
}

export function LogoutDialog({
  showLogoutDialog,
  setShowLogoutDialog,
  completeLabEnd
}: LogoutDialogProps) {
  return (
    <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
      <DialogContent className="bg-white">
        <DialogHeader className="text-center">
          <div className="mx-auto bg-orange-100 rounded-full p-3 w-fit mb-4">
            <X className="h-6 w-6 text-orange-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">End session?</DialogTitle>
          <DialogDescription className="text-gray-600">
            Are you sure you want to end this session? Your progress will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setShowLogoutDialog(false)}
            className="text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={completeLabEnd}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            End session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}