
"use client";

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconName, iconMap, iconNames } from '@/lib/icons';
import type { Category } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, "Nama kategori tidak boleh kosong."),
  icon: z.enum(iconNames, { required_error: "Ikon harus dipilih." }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCategoryFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Omit<Category, 'id'> & { id?: string }) => void;
    categoryToEdit?: Category | null;
}

export function AddCategoryForm({ isOpen, onOpenChange, onSubmit, categoryToEdit }: AddCategoryFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: '', icon: 'ShoppingBasket' },
    });
    
    const isEditing = !!categoryToEdit;

    React.useEffect(() => {
        if (isOpen) {
            if (categoryToEdit) {
                form.reset({
                    name: categoryToEdit.name,
                    icon: categoryToEdit.icon,
                });
            } else {
                form.reset({ name: '', icon: 'ShoppingBasket' });
            }
        }
    }, [isOpen, categoryToEdit, form]);
    
    const handleSubmit = (data: FormValues) => {
        // Construct the data to be submitted, keeping essential fields from the original object
        const submissionData = {
            ...categoryToEdit, // Start with existing data to preserve isEssential etc.
            ...data, // Overwrite name and icon with form data
            id: categoryToEdit?.id,
        };
        onSubmit(submissionData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Ubah Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
                    <DialogDescription>
                        Kelola kategori pengeluaran Anda.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nama Kategori</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Contoh: Belanja Bulanan" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Controller
                            control={form.control}
                            name="icon"
                            render={({ field }) => {
                                const Icon = iconMap[field.value as IconName];
                                return (
                                    <FormItem>
                                        <FormLabel>Ikon</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                                        <SelectValue placeholder="Pilih ikon..." />
                                                    </div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent position="popper">
                                                {iconNames.map(iconName => {
                                                    const IconComponent = iconMap[iconName];
                                                    return (
                                                        <SelectItem key={iconName} value={iconName}>
                                                            <div className="flex items-center gap-2">
                                                                <IconComponent className="h-4 w-4" />
                                                                <span>{iconName}</span>
                                                            </div>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )
                            }}
                        />
                        <DialogFooter>
                            <Button type="submit">{isEditing ? 'Simpan Perubahan' : 'Tambah Kategori'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
