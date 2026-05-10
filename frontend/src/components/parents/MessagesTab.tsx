import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import communicationService from '../../services/communicationService'

type Props = {
  onComposeClick?: () => void
}

export default function MessagesTab({ onComposeClick }: Props) {
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['messages', folder],
    queryFn: () => communicationService.getMessages({ folder, page: 1, per_page: 30 }),
    staleTime: 15_000
  })

  const messages = useMemo(() => (data as any)?.messages || [], [data])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return messages.find((m: any) => Number(m.id) === selectedId) || null
  }, [messages, selectedId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={folder === 'inbox' ? 'default' : 'outline'} onClick={() => setFolder('inbox')}>Inbox</Button>
          <Button variant={folder === 'sent' ? 'default' : 'outline'} onClick={() => setFolder('sent')}>Sent</Button>
          <Button variant={folder === 'trash' ? 'default' : 'outline'} onClick={() => setFolder('trash')}>Trash</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          <Button onClick={onComposeClick}>Compose</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : error ? (
              <div className="text-sm text-slate-600">Failed to load messages.</div>
            ) : !messages.length ? (
              <div className="text-sm text-slate-600">No messages.</div>
            ) : (
              <div className="space-y-2">
                {messages.map((m: any) => {
                  const active = Number(m.id) === selectedId
                  const subject = m?.subject || '(no subject)'
                  const date = m?.created_at ? new Date(m.created_at).toLocaleString() : ''
                  const from = m?.sender_name || `${m?.sender_type || 'sender'} ${m?.sender_id ?? ''}`.trim()
                  const snippet = String(m?.content || '').slice(0, 80)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedId(Number(m.id))}
                      className={`w-full text-left rounded-lg border p-3 ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900 truncate">{subject}</div>
                        <div className="text-xs text-slate-500">{date}</div>
                      </div>
                      <div className="text-xs text-slate-600 truncate">{from}</div>
                      <div className="text-xs text-slate-600 truncate">{snippet}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-sm text-slate-600">Select a message to view.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-lg font-semibold text-slate-900">{selected.subject || '(no subject)'}</div>
                <div className="text-xs text-slate-600">
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">{selected.content || ''}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

