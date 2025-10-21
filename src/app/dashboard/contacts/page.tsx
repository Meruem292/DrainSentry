
"use client";

import React, { useMemo, useState } from "react";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser, useDatabase } from "@/firebase";
import { ref, push, update, remove } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ContactList from "./components/contact-list";
import AddContactDialog from "./components/add-contact-dialog";
import EditContactDialog from "./components/edit-contact-dialog";
import DeleteContactDialog from "./components/delete-contact-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ContactsPage() {
  const { user } = useUser();
  const { database } = useDatabase();
  const path = user ? `users/${user.uid}/contacts` : "";
  const { data: contacts, loading } = useRtdbValue(path);
  const { toast } = useToast();

  const [isAddOpen, setAddOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const contactList = useMemo(() => {
    if (!contacts) return [];
    return Object.keys(contacts).map(key => ({
      id: key,
      ...contacts[key],
    }));
  }, [contacts]);

  const handleAddContact = (contact: { name: string; phone: string }) => {
    if (!user || !database) return;
    const contactsRef = ref(database, `users/${user.uid}/contacts`);
    push(contactsRef, { ...contact, status: "active" })
      .then(() => {
        toast({ title: "Contact added successfully" });
        setAddOpen(false);
      })
      .catch((error) => toast({ variant: "destructive", title: "Error adding contact", description: error.message }));
  };

  const handleEditContact = (contact: any) => {
    setSelectedContact(contact);
    setEditOpen(true);
  };

  const handleUpdateContact = (contact: { id: string, name: string, phone: string }) => {
    if (!user || !database) return;
    const { id, ...rest } = contact;
    const contactRef = ref(database, `users/${user.uid}/contacts/${id}`);
    update(contactRef, rest)
      .then(() => {
        toast({ title: "Contact updated successfully" });
        setEditOpen(false);
      })
      .catch((error) => toast({ variant: "destructive", title: "Error updating contact", description: error.message }));
  };

  const handleDeleteContact = (contact: any) => {
    setSelectedContact(contact);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!user || !database || !selectedContact) return;
    const contactRef = ref(database, `users/${user.uid}/contacts/${selectedContact.id}`);
    remove(contactRef)
      .then(() => {
        toast({ title: "Contact deleted successfully" });
        setDeleteOpen(false);
      })
      .catch((error) => toast({ variant: "destructive", title: "Error deleting contact", description: error.message }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Notification Contacts</h2>
          <p className="text-muted-foreground">Manage SMS notification recipients</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <ContactList
        contacts={contactList}
        loading={loading}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
      />
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>SMS Notifications</AlertTitle>
        <AlertDescription>
          The system will send SMS alerts to the contacts listed above when sensor readings exceed thresholds. All notifications are sent via the GSM module integrated with the DrainSentry system.
        </AlertDescription>
      </Alert>

      <AddContactDialog
        isOpen={isAddOpen}
        onOpenChange={setAddOpen}
        onAddContact={handleAddContact}
      />

      {selectedContact && (
        <EditContactDialog
          isOpen={isEditOpen}
          onOpenChange={setEditOpen}
          contact={selectedContact}
          onUpdateContact={handleUpdateContact}
        />
      )}

      {selectedContact && (
        <DeleteContactDialog
          isOpen={isDeleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirmDelete={confirmDelete}
          contactName={selectedContact.name}
        />
      )}
    </div>
  );
}
