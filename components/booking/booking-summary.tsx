'use client';

import type {
	AddOnListItemResponse,
	CurrentAvailabilitySlot,
	ProductListItemResponse,
	ProductListVariant,
	ProductListVariantLocation,
	ProductListVariantStaffMember,
} from '@opencals/storefront-sdk';
import { computeAddOnLineTotal, formatDuration, formatPrice } from '@/lib/format';
import type { BookingStep } from '@/lib/booking-constants';

interface BookingSummaryProps {
	product: ProductListItemResponse;
	activeVariant: ProductListVariant | null;
	variantLabel: string | null;
	staff: ProductListVariantStaffMember | null;
	location: ProductListVariantLocation | null;
	selectedSlot: CurrentAvailabilitySlot;
	selectedDate: string | null;
	availableAddOns: AddOnListItemResponse[];
	selectedAddOns: Map<string, number>;
	bookedDurationUnits: number;
	currency: string | undefined;
	attendees: number;
	whoSkipped?: boolean;
	formatCustom: (iso: string, fmt: string) => string;
	formatTimeRange: (fromDate: string, fromTime: string, toDate: string, toTime: string) => [string, string];
	onEdit?: (step: BookingStep) => void;
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`Change ${label}`}
			className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-bright)]"
		>
			<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
				/>
			</svg>
			Change
		</button>
	);
}

function Row({
	label,
	value,
	onEdit,
	editLabel,
}: {
	label: string;
	value: string;
	onEdit?: () => void;
	editLabel?: string;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<p className="text-xs font-medium text-[var(--color-ink-dim)]">{label}</p>
				<p className="mt-0.5 font-medium text-[var(--color-ink)]">{value}</p>
			</div>
			{onEdit && <EditButton onClick={onEdit} label={editLabel ?? label} />}
		</div>
	);
}

export function BookingSummary({
	product,
	activeVariant,
	variantLabel,
	staff,
	location,
	selectedSlot,
	selectedDate,
	availableAddOns,
	selectedAddOns,
	bookedDurationUnits,
	currency,
	attendees,
	whoSkipped,
	formatCustom,
	formatTimeRange,
	onEdit,
}: BookingSummaryProps) {
	const [start, end] = formatTimeRange(
		selectedSlot.fromDate,
		selectedSlot.fromTime,
		selectedSlot.toDate,
		selectedSlot.toTime,
	);
	const dateStr = selectedDate ? formatCustom(selectedDate + 'T00:00:00', 'dddd, MMM D') : '';
	const duration = formatDuration(activeVariant?.duration ?? product.duration);

	return (
		<div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] card-shadow">
			<div className="border-b border-[var(--color-line)] px-5 py-4">
				<p className="text-base font-semibold text-[var(--color-ink)]">Your appointment</p>
			</div>
			<div className="space-y-4 px-5 py-5 text-sm">
				<Row
					label="Service"
					value={variantLabel ? `${product.title} · ${variantLabel}` : (product.title ?? 'Service')}
				/>
				{location && (
					<Row label={location.type === 'online' ? 'Visit type' : 'Location'} value={location.type === 'online' ? 'Online visit' : (location.title ?? 'Location')} />
				)}
				<Row
					label="Date"
					value={dateStr}
					onEdit={onEdit ? () => onEdit('when') : undefined}
					editLabel="date"
				/>
				<Row
					label="Time"
					value={`${start} – ${end}`}
					onEdit={onEdit ? () => onEdit('when') : undefined}
					editLabel="time"
				/>
				{staff && (
					<Row
						label="Coach"
						value={`${staff.firstName ?? 'Staff'}${staff.lastName ? ' ' + staff.lastName : ''}`}
						onEdit={onEdit ? () => onEdit(whoSkipped ? 'when' : 'who') : undefined}
						editLabel="coach"
					/>
				)}
				<Row label="Duration" value={duration} />
				{attendees > 1 && <Row label="People" value={String(attendees)} />}

				{selectedAddOns.size > 0 && (
					<div className="border-t border-[var(--color-line)] pt-3 space-y-1.5">
						<p className="text-xs font-medium text-[var(--color-ink-dim)]">Add-ons</p>
						{Array.from(selectedAddOns.entries()).map(([addOnId, qty]) => {
							const addOn = availableAddOns.find((a) => a.id === addOnId);
							if (!addOn) return null;
							const lineTotal = computeAddOnLineTotal(addOn, qty, bookedDurationUnits);
							return (
								<div key={addOnId} className="flex justify-between gap-4 text-xs">
									<span className="text-[var(--color-ink-muted)]">
										{addOn.title ?? addOn.slug}
										{!addOn.durationMultiplied && qty > 1 && ` × ${qty}`}
									</span>
									<span className="font-medium text-[var(--color-ink)]">
										{formatPrice(lineTotal, currency)}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
