import { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    Car,
    Clock,
    MapPin,
    TrendingUp,
    Download,
    Calendar,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { api } from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', '7days'

    // 1. Fetch Real Vehicle Records
    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/vehicles?limit=500');
            setVehicles(res.data.items || []);
        } catch (err: any) {
            console.error('Failed to load analytics data:', err);
            setError('Could not connect to surveillance database records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    // 2. Filter data by Date Range
    const filteredVehicles = useMemo(() => {
        if (dateFilter === 'all') return vehicles;
        const now = new Date();
        return vehicles.filter(v => {
            const vDate = new Date(v.timestamp);
            if (dateFilter === 'today') {
                return vDate.toDateString() === now.toDateString();
            }
            if (dateFilter === '7days') {
                const diffDays = (now.getTime() - vDate.getTime()) / (1000 * 3600 * 24);
                return diffDays <= 7;
            }
            return true;
        });
    }, [vehicles, dateFilter]);

    // 3. Hourly Traffic Breakdown (24 Hours)
    const hourlyData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            count: 0
        }));

        filteredVehicles.forEach(v => {
            const h = new Date(v.timestamp).getHours();
            if (h >= 0 && h < 24) {
                hours[h].count += 1;
            }
        });
        return hours;
    }, [filteredVehicles]);

    // 4. Vehicle Type Distribution (Car, Motorcycle, Truck, etc.)
    const vehicleTypeData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        filteredVehicles.forEach(v => {
            const type = (v.vehicle_type || 'Unknown').toLowerCase();
            const formatted = type.charAt(0).toUpperCase() + type.slice(1);
            counts[formatted] = (counts[formatted] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredVehicles]);

    // 5. Gate & Location Traffic Breakdown
    const locationData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        filteredVehicles.forEach(v => {
            const spot = v.location_spot || v.camera_name || 'Main Gate';
            counts[spot] = (counts[spot] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([location, vehicles]) => ({ location, vehicles }))
            .sort((a, b) => b.vehicles - a.vehicles);
    }, [filteredVehicles]);

    // 6. Key Metrics (KPIs)
    const kpis = useMemo(() => {
        const total = filteredVehicles.length;
        let peakHour = 'N/A';
        let maxHourCount = 0;
        hourlyData.forEach(h => {
            if (h.count > maxHourCount) {
                maxHourCount = h.count;
                peakHour = h.hour;
            }
        });

        const topLocation = locationData.length > 0 ? locationData[0].location : 'N/A';
        const topVehType = vehicleTypeData.length > 0 ? vehicleTypeData[0].name : 'N/A';

        return { total, peakHour, maxHourCount, topLocation, topVehType };
    }, [filteredVehicles, hourlyData, locationData, vehicleTypeData]);

    // 7. CSV Report Export
    const handleExportCSV = () => {
        if (filteredVehicles.length === 0) return;
        const headers = ['ID', 'Number Plate', 'Vehicle Type', 'Confidence', 'Camera', 'Location Spot', 'Timestamp'];
        const rows = filteredVehicles.map(v => [
            v.id,
            v.number_plate,
            v.vehicle_type,
            v.confidence,
            `"${v.camera_name || ''}"`,
            `"${v.location_spot || ''}"`,
            v.timestamp
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `surveillance_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-6">
                <div className="h-8 bg-surface border border-border rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 bg-surface border border-border rounded-lg"></div>
                    ))}
                </div>
                <div className="h-80 bg-surface border border-border rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 flex flex-col p-6 animate-fade-in text-text">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        Security & Traffic Analytics
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Real-time intelligence from license plate scanners and camera detection logs.
                    </p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-surface border border-border px-3 py-1.5 rounded-lg text-sm">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent border-none text-text text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-surface">All Recorded Time</option>
                            <option value="today" className="bg-surface">Today Only</option>
                            <option value="7days" className="bg-surface">Past 7 Days</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchAnalyticsData}
                        className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-muted hover:text-text transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-text-muted text-xs font-semibold uppercase tracking-wider">Total Scans</div>
                        <div className="text-2xl font-bold mt-1 text-text">{kpis.total}</div>
                        <div className="text-xs text-primary mt-1 font-medium">Logged in database</div>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Car className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-text-muted text-xs font-semibold uppercase tracking-wider">Peak Hour</div>
                        <div className="text-2xl font-bold mt-1 text-text">{kpis.peakHour}</div>
                        <div className="text-xs text-text-muted mt-1">{kpis.maxHourCount} vehicles logged</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-text-muted text-xs font-semibold uppercase tracking-wider">Busiest Spot</div>
                        <div className="text-lg font-bold mt-1 text-text truncate max-w-[150px]">{kpis.topLocation}</div>
                        <div className="text-xs text-emerald-500 mt-1 font-medium">Highest vehicle flow</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <MapPin className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-text-muted text-xs font-semibold uppercase tracking-wider">Primary Vehicle</div>
                        <div className="text-2xl font-bold mt-1 text-text">{kpis.topVehType}</div>
                        <div className="text-xs text-purple-400 mt-1 font-medium">Dominant category</div>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Traffic Area Chart (2 Cols) */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-semibold text-text flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Hourly Traffic Distribution (24 Hours)
                            </h2>
                            <p className="text-xs text-text-muted mt-0.5">Peak traffic activity by hour of day</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} />
                                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" name="Vehicles" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vehicle Category Pie Chart (1 Col) */}
                <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
                    <h2 className="text-base font-semibold text-text mb-1">Vehicle Classification</h2>
                    <p className="text-xs text-text-muted mb-4">Split by vehicle model / category</p>
                    <div className="h-64 w-full flex items-center justify-center">
                        {vehicleTypeData.length === 0 ? (
                            <div className="text-sm text-text-muted">No vehicle data available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={vehicleTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {vehicleTypeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Location / Gate Traffic Bar Chart */}
            <div className="bg-surface border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-text mb-1">Gate & Parking Spot Traffic</h2>
                <p className="text-xs text-text-muted mb-4">Comparison of detection volume across facility access points</p>
                <div className="h-60 w-full">
                    {locationData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-sm text-text-muted">
                            No location data recorded yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={locationData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                <XAxis dataKey="location" stroke="#9ca3af" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                                <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="vehicles" fill="#10b981" radius={[4, 4, 0, 0]} name="Vehicles Logged" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
