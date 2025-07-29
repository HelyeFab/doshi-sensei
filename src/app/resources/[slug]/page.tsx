import { Metadata } from 'next';
import ResourcePostClient from './pageClient';

export const metadata: Metadata = {
  title: 'Resource',
  description: 'Japanese learning resources and guides. Comprehensive materials for mastering Japanese.',
  openGraph: {
    title: 'Japanese Learning Resource | Doshi Sensei',
    description: 'Japanese learning resources and guides. Comprehensive materials for mastering Japanese.',
  },
};

export default function ResourcePostPage(props: any) {
  return <ResourcePostClient {...props} />;
}