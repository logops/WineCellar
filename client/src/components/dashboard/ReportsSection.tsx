import { Link } from "wouter";

interface ReportLink {
  label: string;
  href: string;
}

export default function ReportsSection() {
  const reports: ReportLink[] = [
    { label: 'Ready to Drink', href: '/reports' },
    { label: 'Restaurant Style Wine List', href: '/reports?tab=wine-list' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-serif font-medium text-burgundy-700">Reports</h2>
        <div className="ml-2 w-4 h-1 bg-burgundy-600 rounded-full"></div>
        <div className="ml-1 w-3 h-1 bg-burgundy-500 rounded-full"></div>
      </div>
      
      <div className="space-y-3">
        {reports.map((report) => (
          <Link 
            key={report.label} 
            href={report.href} 
            className="flex items-center justify-between p-3 border rounded-md hover:bg-cream-50 transition-colors"
          >
            <span className="text-burgundy-600 font-medium font-elegant">{report.label}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
