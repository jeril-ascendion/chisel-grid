import { EditArticleEditor } from './editor';

export const metadata = { title: 'Edit Article' };

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return <EditArticleEditor params={params} />;
}
