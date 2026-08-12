import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import RegisterPage from './content'

export const metadata: Metadata = pageMetadata.authRegister
export const instant = false;

export default function Page() {
  return <RegisterPage />
}
