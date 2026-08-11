import { Metadata } from 'next';
import SignInViewPage from '@/components/auth/sign-in-view';

export const metadata: Metadata = {
  title: 'Sign In | Campus Connect',
  description: 'Sign in to Campus Connect at Jazeera University.'
};

export default function SignInPage() {
  return <SignInViewPage />;
}
