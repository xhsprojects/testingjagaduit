
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import type { PersonalNote } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { saveNote } from '@/app/notes/actions'

const formSchema = z.object({
  title: z.string(),
  content: z.string(),
}).refine(data => data.title.trim() !== '' || data.content.trim() !== '', {
  message: 'Judul atau isi catatan tidak boleh kosong.',
  path: ['title'], // You can point to one field, or use a general message
});

type FormValues = z.infer<typeof formSchema>

interface NoteFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  noteToEdit?: PersonalNote | null;
}

export function NoteForm({ isOpen, onOpenChange, noteToEdit }: NoteFormProps) {
  const { idToken } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      if (noteToEdit) {
        form.reset({
          title: noteToEdit.title,
          content: noteToEdit.content,
        });
      } else {
        form.reset({
          title: "",
          content: "",
        });
      }
    }
  }, [isOpen, noteToEdit, form]);

  const handleSubmit = async (data: FormValues) => {
    if (!idToken) return;

    setIsSubmitting(true);
    const noteData: Omit<PersonalNote, 'updatedAt'> = {
      id: noteToEdit?.id || `note-${Date.now()}`,
      title: data.title.trim(),
      content: data.content.trim(),
    };
    
    const result = await saveNote(idToken, noteData);

    if (result.success) {
        toast({ title: 'Sukses', description: result.message });
        onOpenChange(false);
    } else {
        toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  const isEditing = !!noteToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-[80vh] sm:max-h-[80vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Catatan' : 'Tambah Catatan Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail catatan Anda.' : 'Tulis ide, daftar tugas, atau apa pun di sini.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Input placeholder="Judul Catatan..." {...field} className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                     <FormLabel className="sr-only">Isi Catatan</FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Tulis apa saja... Anda bisa menggunakan Markdown untuk format teks, contoh: **teks tebal** atau *teks miring*."
                            className="min-h-full h-full flex-1 border-none shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Catatan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
