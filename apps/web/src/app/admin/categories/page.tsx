import { CategoryManagement } from '@/components/admin/category-management';

export const metadata = { title: 'Category Management' };

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Category Management</h1>
        <p className="text-sm text-gray-500 mt-1">Organize content taxonomy</p>
      </div>
      <CategoryManagement />
    </div>
  );
}
