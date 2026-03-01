import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, ServerCrash, Cpu, Globe } from "lucide-react";

export default function AdminPage() {
    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Global Health Pulse</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tenants (Gym Chains)</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14</div>
                        <p className="text-xs text-muted-foreground">3 pending stripe subscriptions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IoT Devices Online</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">32 / 34</div>
                        <p className="text-xs text-muted-foreground">Raspberry Pi / Jetson nodes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Auth Traffic (Last Hour)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2,109</div>
                        <p className="text-xs text-muted-foreground">Faces processed across network</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
                        <ServerCrash className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">2</div>
                        <p className="text-xs text-muted-foreground">Offline Edge Nodes detected</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>IoT Fleet Status</CardTitle>
                        <CardDescription>
                            Real-time synchronization status of all facial recognition edge devices globally.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Gym / Branch</TableHead>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Device MAC</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Last Ping</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[
                                    { gym: "SmartFit Polanco", tenant: "SmartFit MX", mac: "b8:27:eb:c8:...:11", status: "ONLINE", ping: "2s ago" },
                                    { gym: "SmartFit Condesa", tenant: "SmartFit MX", mac: "b8:27:eb:d9:...:a2", status: "ONLINE", ping: "5s ago" },
                                    { gym: "IronGym Central", tenant: "IronGym C.A", mac: "e4:5f:01:aa:...:fb", status: "OFFLINE", ping: "1h 45m ago" },
                                    { gym: "IronGym Sur", tenant: "IronGym C.A", mac: "e4:5f:01:bb:...:fc", status: "OFFLINE", ping: "2h 10m ago" },
                                ].map((device, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{device.gym}</TableCell>
                                        <TableCell>{device.tenant}</TableCell>
                                        <TableCell className="font-mono text-xs">{device.mac}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${device.status === 'ONLINE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {device.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">{device.ping}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
