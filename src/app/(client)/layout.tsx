import { getUserCtx } from '@/lib/user-context'
import { redirect } from 'next/navigation'

// Protects /instancias/[id] — authenticated clients only.
// /dashboard is handled by app/dashboard/page.tsx (outside this group).

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserCtx()

  if (!ctx) redirect('/login')

  // role comes from profiles table (fallback from app_metadata) via getUserCtx,
  // so manually-created users without app_metadata.role are handled correctly.
  if (ctx.role !== 'client' && ctx.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-green-700">WPP Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">Meu Painel</p>
        </div>
        <nav className="flex-1 p-4">
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            ← Minhas Instâncias
          </a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">{ctx.email}</p>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
