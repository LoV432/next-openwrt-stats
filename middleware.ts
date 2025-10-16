import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	if (process.env.LEGACY_DATABASE_DETECTED === 'true') {
		return NextResponse.redirect(new URL('/legacy-migration', request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ['/', '/register']
};
