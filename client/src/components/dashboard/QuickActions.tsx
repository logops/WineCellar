import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "@/components/forms/AddWineForm";
import ConsumeWineForm from "@/components/forms/ConsumeWineForm";
import { Link } from "wouter";

export default function QuickActions() {
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);

  return (
    <div className="mt-8 space-y-3">
      <button 
        className="w-full flex items-center justify-between bg-burgundy-600 hover:bg-burgundy-700 text-white p-3 rounded-md transition-colors"
        onClick={() => setShowAddWineModal(true)}
      >
        <span className="font-medium">Add Wine to My Cellar</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button 
        className="w-full flex items-center justify-between bg-white border border-burgundy-600 hover:bg-cream-50 text-burgundy-600 p-3 rounded-md transition-colors"
        onClick={() => setShowConsumeModal(true)}
      >
        <span className="font-medium">Drink or Remove</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
      
      <Link href="/wishlist" className="w-full flex items-center justify-between bg-white border border-burgundy-600 hover:bg-cream-50 text-burgundy-600 p-3 rounded-md transition-colors">
        <span className="font-medium">My Wish List</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </Link>
      
      <Link href="/notes" className="w-full flex items-center justify-between bg-white border border-burgundy-600 hover:bg-cream-50 text-burgundy-600 p-3 rounded-md transition-colors">
        <span className="font-medium">My Notes</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Link>

      {/* Add Wine Dialog */}
      <Dialog open={showAddWineModal} onOpenChange={setShowAddWineModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Wine to My Cellar</DialogTitle>
          </DialogHeader>
          <AddWineForm onSuccess={() => setShowAddWineModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Consume Wine Dialog */}
      <Dialog open={showConsumeModal} onOpenChange={setShowConsumeModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Drink or Remove Wine</DialogTitle>
          </DialogHeader>
          <ConsumeWineForm onSuccess={() => setShowConsumeModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
