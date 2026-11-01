import '@/lib/opencals';
import {
	AppointmentService,
	CartService,
	type AppointmentDateRangeSlot,
	type AppointmentGuest,
	type CheckoutQuestionAnswer,
	type CreateAppointmentAddOn,
	type ExistingAppointmentCustomer,
	type NewAppointmentCustomer,
} from '@opencals/storefront-sdk';
import { getAccessToken } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleApiError } from '@/lib/api-error-handler';

/** The booker as the flow sends it; `kind` picks which of the two shapes is meant. */
type CustomerInput = Required<Pick<ExistingAppointmentCustomer | NewAppointmentCustomer, 'kind'>> &
	Partial<Pick<ExistingAppointmentCustomer, 'customerId'> & Pick<NewAppointmentCustomer, 'email' | 'firstName' | 'lastName'>>;

export async function POST(request: NextRequest) {
	const cartIdHeader = request.headers.get('X-Cart-Id') ?? '';

	try {
		const body = await request.json();
		const { slot, numberOfAttendees, addOns, customer, checkoutQuestionAnswers, guests, customAttributes } = body as {
			slot: AppointmentDateRangeSlot;
			numberOfAttendees?: number;
			addOns?: CreateAppointmentAddOn[];
			customer?: CustomerInput;
			checkoutQuestionAnswers?: CheckoutQuestionAnswer[];
			/** Crew emails: invited as guests (they get the booking emails; capacity is unaffected) */
			guests?: AppointmentGuest[];
			/** Free-form notes on the booking, e.g. `crew: "Sam, Alex"` */
			customAttributes?: Record<string, string>;
		};

		if (!slot?.productId || !slot?.fromDate || !slot?.fromTime || !slot?.toDate || !slot?.toTime) {
			return NextResponse.json({ error: 'Invalid slot data' }, { status: 400 });
		}

		const token = await getAccessToken();
		const authHeaders = { Authorization: `Bearer ${token ?? ''}` };

		const { data: cart } = await CartService.createOrGet({
			headers: { ...authHeaders, 'X-Cart-Id': cartIdHeader },
			throwOnError: true,
		});

		const { data: appointment } = await AppointmentService.create({
			body: {
				slot: {
					productId: slot.productId,
					fromDate: slot.fromDate,
					fromTime: slot.fromTime,
					toDate: slot.toDate,
					toTime: slot.toTime,
					staffMemberId: slot.staffMemberId ?? null,
					locationId: slot.locationId ?? null,
				},
				numberOfAttendees: numberOfAttendees ?? 1,
				cartId: cart.id,
				addOns: (addOns ?? [])
					.filter((a) => a?.addOnId)
					.map((a) => ({
						addOnId: a.addOnId,
						...(typeof a.quantity === 'number' ? { quantity: a.quantity } : {}),
					})),
				...(customer
				? {
						customer:
							customer.kind === 'existing' && customer.customerId
								? { customerId: customer.customerId }
								: { externalId: customer.email ?? '', email: customer.email ?? '', firstName: customer.firstName, lastName: customer.lastName },
					}
				: {}),
				...(checkoutQuestionAnswers && checkoutQuestionAnswers.length > 0
					? { checkoutQuestionAnswers }
					: {}),
				...(guests && guests.length > 0 ? { guests: guests.filter((g) => g?.email).slice(0, 3) } : {}),
				...(customAttributes && Object.keys(customAttributes).length > 0 ? { customAttributes } : {}),
			},
			headers: authHeaders,
			throwOnError: true,
		});

		// The court is held now: drop its cached availability so the hall and grid show it taken at once.
		revalidateTag(`court:${slot.productId}`);

		const { data: finalCart } = await CartService.get({
			headers: { ...authHeaders, 'X-Cart-Id': cart.id },
			throwOnError: true,
		});

		return NextResponse.json({ appointment, cart: finalCart });
	} catch (err) {
		return handleApiError(err);
	}
}
