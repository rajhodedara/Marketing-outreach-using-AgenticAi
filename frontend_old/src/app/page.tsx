"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, Upload, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
  created_at: string;
  status: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    (acc.domain && acc.domain.toLowerCase().includes(search.toLowerCase())) || 
    (acc.company_name && acc.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage and analyze your target accounts.</p>
        </div>
        <Button onClick={() => router.push('/upload')} className="gap-2">
          <Upload className="w-4 h-4" />
          Ingest New Data
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ingested Accounts</CardTitle>
              <CardDescription>A list of all accounts available for orchestration.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search accounts..."
                className="pl-8 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Building2 className="w-12 h-12 mb-4 opacity-20" />
              <p>No accounts found.</p>
              {search === "" && (
                <Button variant="link" onClick={() => router.push('/upload')} className="mt-2">
                  Upload some data to get started
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Company</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id} className="group cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => router.push(`/accounts/${account.id}`)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                            {(account.company_name || account.domain).substring(0, 2)}
                          </div>
                          {account.company_name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{account.domain}</TableCell>
                      <TableCell>
                        <Badge variant={account.status === "analyzed" ? "default" : "secondary"} className="capitalize">
                          {account.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(account.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View Analysis
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
