
"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Category, Expense } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { FileDown, FileType2, Pencil, Trash2 } from "lucide-react"
import { iconMap } from "@/lib/icons"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface ExpenseTableProps {
    expenses: Expense[];
    categories: Category[];
    onEdit: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
    onRowClick?: (expense: Expense) => void;
    onExportCSV?: () => void;
    onExportPDF?: () => void;
    title?: string;
    description?: string;
    showFooter?: boolean;
    readOnly?: boolean;
    headerAction?: React.ReactNode;
}

export default function ExpenseTable({ 
    expenses, 
    categories, 
    onEdit, 
    onDelete,
    onRowClick,
    onExportCSV,
    onExportPDF,
    title = "Transaksi Terakhir",
    description = "Daftar pengeluaran terbaru Anda.",
    showFooter = true,
    readOnly = false,
    headerAction,
}: ExpenseTableProps) {
    const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, icon: c.icon }]));

    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {headerAction}
                </div>
            </CardHeader>
            <CardContent>
                <div className="max-h-[360px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead>Kategori</TableHead>
                                <TableHead className="hidden md:table-cell">Catatan</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                {!readOnly && <TableHead className="text-right">Aksi</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedExpenses.length > 0 ? (
                                sortedExpenses.map(expense => {
                                    const category = categoryMap.get(expense.categoryId);
                                    const Icon = category ? iconMap[category.icon] : null;
                                    return (
                                        <TableRow
                                            key={expense.id}
                                            onClick={() => onRowClick?.(expense)}
                                            className={onRowClick ? "cursor-pointer" : ""}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                                    <span className="font-medium">{category?.name || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell max-w-xs truncate">{expense.notes}</TableCell>
                                            <TableCell>{format(new Date(expense.date), "d MMM yyyy, HH:mm", { locale: idLocale })}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">Ubah</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(expense.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Hapus</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={readOnly ? 4 : 5} className="text-center">Belum ada pengeluaran yang dicatat untuk periode ini.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            {showFooter && (onExportCSV || onExportPDF) && (
                 <CardFooter className="justify-end gap-2">
                    {onExportCSV && (
                        <Button variant="outline" size="sm" onClick={onExportCSV} disabled={expenses.length === 0}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    )}
                    {onExportPDF && (
                        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={expenses.length === 0}>
                            <FileType2 className="mr-2 h-4 w-4" />
                            Ekspor PDF
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    )
}
