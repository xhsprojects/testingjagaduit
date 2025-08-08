
import type { Metadata } from 'next';
import InvestorClientPage from './client';

export const metadata: Metadata = {
  title: 'Invest in Jaga Duit - Shape the Future of Personal Finance',
  description: 'Jaga Duit is seeking investment to accelerate growth and revolutionize personal finance management in Southeast Asia. Discover our vision, traction, and investment opportunities.',
  keywords: [
    'invest in tech startup',
    'fintech investment',
    'Jaga Duit funding',
    'saas investment opportunity',
    'seed investment indonesia',
    'venture capital',
    'angel investor',
  ],
  alternates: {
    canonical: '/investor',
  },
};

export default function InvestorPage() {
  return <InvestorClientPage />;
}
