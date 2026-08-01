import { login, signup } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] border border-border rounded-lg bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your email to sign in to your account</p>
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded text-sm mb-6 border border-destructive/20">
            {error}
          </div>
        )}

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              Email
            </label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="name@example.com"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              Password
            </label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button 
              formAction={login} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full"
            >
              Log in
            </button>
            <button 
              formAction={signup} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
