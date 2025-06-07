import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <nav className="mb-12">
        <ul className="flex justify-center space-x-6">
          <li><Link href="/" className="text-blue-500 hover:underline">Home</Link></li>
          <li><Link href="/documentation" className="text-blue-500 hover:underline">Documentation</Link></li>
          <li><Link href="/auth/login" className="text-blue-500 hover:underline">Login</Link></li>
        </ul>
      </nav>
      <h1 className="text-4xl font-bold mb-8">Welcome to Our Product!</h1>
      <p className="text-xl mb-12">
        Discover how our product can help you manage your properties efficiently.
        Track finances, manage tenants, and organize tasks all in one place.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="border p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Feature 1: Comprehensive Dashboard</h2>
          <p>Get a clear overview of your properties, finances, and tasks at a glance.</p>
        </div>
        <div className="border p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Feature 2: Tenant Management</h2>
          <p>Easily manage tenant information, track payments, and communicate effectively.</p>
        </div>
        <div className="border p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Feature 3: Task Organization</h2>
          <p>Create, assign, and track tasks to ensure nothing falls through the cracks.</p>
        </div>
      </div>
      <Link href="/auth/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded text-lg">
        Get Started
      </Link>
    </div>
  );
}
