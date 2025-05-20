import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Contact } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  
  useEffect(() => {
    if (!user) return;

    const contactsRef = ref(database, `users/${user.uid}/contacts`);
    
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const contactList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setContacts(contactList);
      } else {
        setContacts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddContact = async () => {
    if (!user) return;
    
    if (!contactName.trim()) {
      toast({
        title: "Contact name is required",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    if (!contactPhone.trim()) {
      toast({
        title: "Phone number is required",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      const newContact = {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        status: "active"
      };
      
      const contactsRef = ref(database, `users/${user.uid}/contacts`);
      
      if (editMode && currentContact) {
        // Update existing contact
        const contactRef = ref(database, `users/${user.uid}/contacts/${currentContact.id}`);
        await update(contactRef, newContact);
        
        toast({
          title: "Contact updated",
          description: "The contact has been updated successfully",
        });
      } else {
        // Add new contact
        await push(contactsRef, newContact);
        
        toast({
          title: "Contact added",
          description: "The contact has been added successfully",
        });
      }
      
      // Reset form
      setContactName("");
      setContactPhone("");
      setEditMode(false);
      setCurrentContact(null);
      
    } catch (error) {
      console.error("Error adding/updating contact:", error);
      toast({
        title: `Failed to ${editMode ? 'update' : 'add'} contact`,
        description: `There was an error ${editMode ? 'updating' : 'adding'} the contact. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditMode(true);
    setCurrentContact(contact);
    setContactName(contact.name);
    setContactPhone(contact.phone);
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!user) return;
    
    try {
      const contactRef = ref(database, `users/${user.uid}/contacts/${contactId}`);
      await remove(contactRef);
      
      toast({
        title: "Contact removed",
        description: "The contact has been removed successfully",
      });
    } catch (error) {
      console.error("Error removing contact:", error);
      toast({
        title: "Failed to remove contact",
        description: "There was an error removing the contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout 
      title="Contacts" 
      subtitle="Manage SMS notification recipients"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-800">SMS Notification Contacts</h2>
        
        <Dialog onOpenChange={(open) => {
          if (!open) {
            setEditMode(false);
            setCurrentContact(null);
            setContactName("");
            setContactPhone("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Contact" : "Add New Contact"}</DialogTitle>
              <DialogDescription>
                {editMode 
                  ? "Update the contact information below."
                  : "Enter the contact details to receive SMS notifications."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="contactName">Name</Label>
                <Input 
                  id="contactName" 
                  value={contactName} 
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter contact name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input 
                  id="contactPhone" 
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Enter phone number with country code"
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleAddContact}>
                  {editMode ? "Update Contact" : "Add Contact"}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          {contacts.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Contacts</h3>
              <p className="text-gray-500 text-center mb-6">Add contacts to receive SMS notifications when sensor readings exceed thresholds.</p>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Enter the contact details to receive SMS notifications.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contactName">Name</Label>
                      <Input 
                        id="contactName" 
                        value={contactName} 
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Enter contact name"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="contactPhone">Phone Number</Label>
                      <Input 
                        id="contactPhone" 
                        value={contactPhone} 
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Enter phone number with country code"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button onClick={handleAddContact}>Add Contact</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(contact => (
                    <tr key={contact.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">{contact.name}</td>
                      <td className="py-3 px-4">{contact.phone}</td>
                      <td className="py-3 px-4">
                        <span className="status-badge status-badge-success">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Contact</DialogTitle>
                                <DialogDescription>
                                  Update the contact information below.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="editContactName">Name</Label>
                                  <Input 
                                    id="editContactName" 
                                    value={contactName} 
                                    onChange={(e) => setContactName(e.target.value)}
                                  />
                                </div>
                                
                                <div className="grid gap-2">
                                  <Label htmlFor="editContactPhone">Phone Number</Label>
                                  <Input 
                                    id="editContactPhone" 
                                    value={contactPhone} 
                                    onChange={(e) => setContactPhone(e.target.value)}
                                  />
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button onClick={handleAddContact}>Update Contact</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-destructive" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Remove Contact</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to remove this contact? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => handleRemoveContact(contact.id)}
                                  >
                                    Remove
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Alert className="bg-blue-50 border-l-4 border-primary">
        <Info className="h-5 w-5 text-primary" />
        <AlertDescription className="ml-2">
          <h4 className="text-sm font-medium text-primary mb-1">SMS Notifications</h4>
          <p className="text-sm text-gray-600">
            The system will send SMS alerts to the contacts listed above when sensor readings exceed thresholds.
            All notifications are sent via the GSM module integrated with the DrainSentry system.
          </p>
        </AlertDescription>
      </Alert>
    </DashboardLayout>
  );
}
