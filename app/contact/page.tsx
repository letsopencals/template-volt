import { ContactView } from '@/components/contact/contact-view';
import { getCatalogue } from '@/lib/server-data';

export default async function ContactPage() {
	const cat = await getCatalogue();
	return <ContactView clubs={cat.clubs.filter((c) => c.courtCount > 0)} />;
}
