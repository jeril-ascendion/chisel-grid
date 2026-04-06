import { eq } from 'drizzle-orm';
import { getDb, getPool } from '../client';
import { tenants } from '../schema/tenants';
import { categories } from '../schema/content';
import { CATEGORY_TREE } from './categories';

async function seed() {
  const db = getDb();

  console.log('Seeding database...');

  // 1. Create default tenant (Ascendion Engineering)
  const [defaultTenant] = await db
    .insert(tenants)
    .values({
      name: 'Ascendion Engineering',
      subdomain: 'ascendion',
      plan: 'internal',
    })
    .onConflictDoNothing()
    .returning();

  let tenantId = defaultTenant?.tenantId;
  if (!tenantId) {
    console.log('Default tenant already exists, looking up...');
    const [existing] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, 'ascendion'));
    if (!existing) throw new Error('Could not find or create default tenant');
    tenantId = existing.tenantId;
    console.log(`Using existing tenant: ${tenantId}`);
  } else {
    console.log(`Created default tenant: ${tenantId}`);
  }

  await seedCategories(db, tenantId);

  console.log('Seeding complete.');
  await getPool().end();
}

async function seedCategories(db: ReturnType<typeof getDb>, tenantId: string) {
  console.log('Seeding categories...');
  let count = 0;

  for (const domain of CATEGORY_TREE) {
    // Insert parent category
    const [parent] = await db
      .insert(categories)
      .values({
        tenantId,
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        sortOrder: domain.sortOrder,
        iconName: domain.iconName,
      })
      .onConflictDoNothing()
      .returning();

    const parentId = parent?.categoryId;
    count++;

    if (parentId) {
      for (const child of domain.children) {
        await db
          .insert(categories)
          .values({
            tenantId,
            name: child.name,
            slug: child.slug,
            description: child.description,
            parentId,
            sortOrder: child.sortOrder,
          })
          .onConflictDoNothing();
        count++;
      }
    }
  }

  console.log(`Seeded ${count} categories (6 domains, 18 subcategories).`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
