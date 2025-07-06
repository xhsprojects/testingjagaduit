
"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { iconNames, IconName, iconMap } from '@/lib/icons';
import { presetCategories } from '@/lib/data';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama kategori tidak boleh kosong."),
  budget: z.coerce.number().min(0, "Anggaran harus angka positif.").default(0),
  icon: z.string().min(1, "Pilih ikon."),
  isEssential: z.boolean().optional(),
  isDebtCategory: z.boolean().optional(),
});

const allocationFormSchema = z.object({
  categories: z.array(categorySchema).min(1, "Harus ada minimal satu kategori anggaran."),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

interface AllocationPageProps {
  onSave: (data: { income: number; categories: Category[] }) => void;
}

export default function AllocationPage({ onSave }: AllocationPageProps) {
  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      categories: presetCategories.map((cat, index) => ({
        ...cat,
        id: `preset-cat-${index}`,
        budget: 0,
        icon: cat.icon as string,
        isEssential: cat.isEssential || false,
        isDebtCategory: cat.isDebtCategory || false,
      })),
    },
    mode: "onChange",
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const watchCategories = useWatch({ control: form.control, name: 'categories' });

  const totalAllocated = React.useMemo(() => {
    return (watchCategories || []).reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
  }, [watchCategories]);

  const handleAddNewCategory = () => {
    append({
      id: `cat-new-${Date.now()}`,
      name: '',
      budget: 0,
      icon: 'PiggyBank',
      isEssential: false,
      isDebtCategory: false,
    });
  };

  const onSubmit = (data: AllocationFormValues) => {
    const totalIncome = data.categories.reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
    onSave({
        income: totalIncome,
        categories: data.categories.map(c => ({
            ...c,
            icon: c.icon as IconName,
        }))
    });
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Atur Anggaran Bulanan Anda</CardTitle>
          <CardDescription>Tentukan alokasi dana untuk setiap kategori. Total dari semua alokasi ini akan menjadi anggaran bulanan Anda.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Alokasi Anggaran</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg bg-background">
                       <Controller
                            control={form.control}
                            name={`categories.${index}.icon`}
                            render={({ field }) => {
                                const Icon = iconMap[field.value as IconName] || Wallet;
                                return (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-20 h-16">
                                                <SelectValue>
                                                    <Icon className="h-6 w-6 mx-auto" />
                                                </SelectValue>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
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
                                )
                            }}
                        />
                      <div className="flex-grow space-y-1">
                        <FormField
                          control={form.control}
                          name={`categories.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl>
                                <Input placeholder="Nama Kategori" {...field} disabled={watchCategories?.[index]?.isEssential} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`categories.${index}.budget`}
                          render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl>
                                <Input 
                                  type="text" 
                                  inputMode="numeric"
                                  placeholder="Anggaran (Rp)" 
                                  value={field.value > 0 ? formatCurrency(field.value) : ""}
                                  onChange={(e) => {
                                    const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                    field.onChange(numericValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        type="button" 
                        onClick={() => remove(index)} 
                        className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={watchCategories?.[index]?.isEssential}
                        title={watchCategories?.[index]?.isEssential ? "Kategori ini tidak dapat dihapus" : "Hapus kategori"}
                        >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                 {form.formState.errors.categories && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.categories.message || form.formState.errors.categories.root?.message}</p>
                )}
                <Button type="button" variant="outline" onClick={handleAddNewCategory} className="w-full">
                  <PlusCircle className="mr-2" /> Tambah Kategori Baru
                </Button>
              </div>

              <div className="p-4 bg-secondary rounded-lg space-y-2">
                 <div className="flex justify-between items-center text-lg">
                    <span className="font-bold font-headline flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      Total Anggaran Bulanan
                    </span>
                    <span className="font-bold font-headline text-primary">{formatCurrency(totalAllocated)}</span>
                </div>
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
                Simpan Anggaran & Mulai
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
