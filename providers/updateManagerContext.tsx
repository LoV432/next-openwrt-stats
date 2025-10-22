'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';

type RouterUpdateAction =
	| {
			router: string;
			type: 'updateStatus';
			value: number;
	  }
	| {
			router: string;
			type: 'updatePackages';
			value: string[];
	  }
	| {
			router: string;
			type: 'updatePackageText';
			value: string;
	  }
	| {
			router: string;
			type: 'updateError';
			value: { message: string; cause?: string };
	  }
	| {
			router: string;
			type: 'updateFlashModalOpen';
			value: boolean;
	  };

type RouterUpdateState = {
	buildStatus: number;
	flashModalOpen: boolean;
	error: { message: string; cause?: string };
	packages: string[];
	packageText: string;
};

type UpdateManagerContextType = {
	getRouterState: (router: string) => RouterUpdateState;
	dispatch: (action: RouterUpdateAction) => void;
};

const UpdateManagerContext = createContext<
	UpdateManagerContextType | undefined
>(undefined);

function updateStateReducer(
	state: Record<string, RouterUpdateState>,
	action: RouterUpdateAction
) {
	let prevRouterState = state[action.router];
	if (!prevRouterState) {
		prevRouterState = {
			buildStatus: buildStatusEnum.initial,
			flashModalOpen: false,
			error: { message: '' },
			packages: [],
			packageText: ''
		};
	}
	switch (action.type) {
		case 'updateStatus':
			return {
				...state,
				[action.router]: {
					...prevRouterState,
					buildStatus: action.value
				}
			};
		case 'updatePackages':
			return {
				...state,
				[action.router]: {
					...prevRouterState,
					packages: action.value
				}
			};
		case 'updatePackageText':
			return {
				...state,
				[action.router]: {
					...prevRouterState,
					packageText: action.value
				}
			};
		case 'updateError':
			return {
				...state,
				[action.router]: {
					...prevRouterState,
					error: action.value
				}
			};
		case 'updateFlashModalOpen':
			return {
				...state,
				[action.router]: {
					...prevRouterState,
					flashModalOpen: action.value
				}
			};
		default:
			return state;
	}
}

export function UpdateManagerProvider({ children }: { children: ReactNode }) {
	const [routerStates, dispatch] = useReducer(
		updateStateReducer,
		{} as Record<string, RouterUpdateState>
	);

	function getRouterState(router: string) {
		if (!routerStates[router]) {
			return {
				buildStatus: buildStatusEnum.initial,
				flashModalOpen: false,
				error: { message: '' },
				packages: [],
				packageText: ''
			};
		}
		return routerStates[router];
	}

	const value = {
		getRouterState,
		dispatch
	};

	return (
		<UpdateManagerContext.Provider value={value}>
			{children}
		</UpdateManagerContext.Provider>
	);
}

export function useUpdateManager() {
	const context = useContext(UpdateManagerContext);
	if (context === undefined) {
		throw new Error(
			'useUpdateManager must be used within an UpdateManagerProvider'
		);
	}
	return context;
}

export const buildStatusEnum = {
	building: 202,
	uploading: 200,
	ready_to_flash: 210,
	flashing: 250,
	flashed: 290,
	failed: 500,
	initial: 10
} as const;
