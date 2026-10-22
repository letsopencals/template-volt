import { redirect } from 'next/navigation';

// Every game and training lives on the account's "My games" board.
export default function AppointmentsPage() {
	redirect('/account');
}
