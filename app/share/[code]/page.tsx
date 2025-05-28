import { ShareLinkAccess } from '@/components/ShareLinkAccess'

interface SharePageProps {
  params: Promise<{ code: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { code } = await params
  
  return <ShareLinkAccess code={code} />
}