'use client';

import type { ProductListVariantStaffMember } from '@opencals/storefront-sdk';

interface StaffSelectorProps {
	staffMembers: ProductListVariantStaffMember[];
	selected: string | null;
	onSelect: (staffMemberId: string | null) => void;
	hideLabel?: boolean;
}

function getImageUrl(staff: ProductListVariantStaffMember): string | null {
	const img = staff.image as { url?: string } | undefined;
	return img?.url ?? null;
}

function getInitials(staff: ProductListVariantStaffMember): string {
	const first = (staff.firstName?.[0] ?? '').toUpperCase();
	const last = (staff.lastName?.[0] ?? '').toUpperCase();
	return `${first}${last}` || (staff.email?.[0]?.toUpperCase() ?? '?');
}

export function StaffSelector({ staffMembers, selected, onSelect, hideLabel = false }: StaffSelectorProps) {
	if (staffMembers.length === 0) return null;

	return (
		<div>
			{!hideLabel && <p className="text-sm font-semibold text-[var(--color-ink)]">Choose your coach</p>}
			<div className={`no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 ${hideLabel ? '' : 'mt-4'}`}>
				{/* "Any" card */}
				<button
					type="button"
					onClick={() => onSelect(null)}
					className={`group flex w-[128px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all ${
						selected === null
							? 'border-[var(--color-primary)] bg-[var(--color-brass-soft)]'
							: 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
					}`}
				>
					<div className="flex aspect-[3/4] w-full items-center justify-center bg-[var(--color-sand)]">
						<svg className="h-10 w-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<div className="px-3 py-2.5 text-left">
						<p className={`text-sm font-semibold ${selected === null ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'}`}>
							Any coach
						</p>
						<p className="text-xs text-[var(--color-ink-dim)]">Next available</p>
					</div>
				</button>

				{staffMembers.map((staff) => {
					const imageUrl = getImageUrl(staff);
					const name = staff.firstName ?? 'Staff';
					const isSelected = selected === staff.id;

					return (
						<button
							key={staff.id}
							type="button"
							onClick={() => onSelect(staff.id)}
							className={`group flex w-[128px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all ${
								isSelected
									? 'border-[var(--color-primary)] bg-[var(--color-brass-soft)]'
									: 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
							}`}
						>
							<div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-sand)]">
								{imageUrl ? (
									<img src={imageUrl} alt={name} className="h-full w-full object-cover object-top" />
								) : (
									<div className="flex h-full w-full items-center justify-center">
										<span className="heading-display text-3xl text-[var(--color-primary)]">{getInitials(staff)}</span>
									</div>
								)}
								{isSelected && (
									<span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
										<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</span>
								)}
							</div>
							<div className="px-3 py-2.5 text-left">
								<p className={`truncate text-sm font-semibold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'}`}>
									{name} {staff.lastName ?? ''}
								</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
