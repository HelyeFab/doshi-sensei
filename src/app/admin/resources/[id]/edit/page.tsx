import { Metadata } from 'next';
import EditResourceClient from './pageClient';

export const metadata: Metadata = {
  title: 'Edit Resource',
  description: 'Edit learning resource content and settings.',
  openGraph: {
    title: 'Edit Resource | Doshi Sensei Admin',
    description: 'Edit learning resource content and settings.',
  },
};

export default function EditResourcePage(props: any) {
  return <EditResourceClient {...props} />;
}