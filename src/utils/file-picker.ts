type LegacyAccept = string | undefined;

type FilePickerAcceptDescriptor = {
	description?: string;
	accept: Record<string, string[]>;
};

type FilePickerRequest = {
	accept?: FilePickerAcceptDescriptor[];
	multiple?: boolean;
	excludeAcceptAllOption?: boolean;
	legacyAccept?: LegacyAccept;
};

const isFileSystemAPISupported = (): boolean =>
	typeof window !== 'undefined' && typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === 'function';

const pickWithFileSystemAPI = async (options: FilePickerRequest): Promise<File | null> => {
	try {
		const handles = await (window as unknown as {
			showOpenFilePicker: (
				opts: {
					multiple?: boolean;
					excludeAcceptAllOption?: boolean;
					types?: FilePickerAcceptDescriptor[];
				}
			) => Promise<FileSystemFileHandle[]>;
		}).showOpenFilePicker({
			multiple: options.multiple ?? false,
			excludeAcceptAllOption: options.excludeAcceptAllOption ?? false,
			types: options.accept,
		});

		const handle = handles[0];
		if (!handle) {
			return null;
		}

		const file = await handle.getFile();
		return file ?? null;
	} catch (error) {
		if ((error as DOMException)?.name === 'AbortError') {
			return null;
		}

		throw error;
	}
};

const pickWithInputElement = (options: FilePickerRequest): Promise<File | null> => {
	return new Promise<File | null>((resolve, reject) => {
		if (typeof document === 'undefined') {
			reject(new Error('File picking is not supported in this environment.'));
			return;
		}

		const input = document.createElement('input');
		input.type = 'file';
		input.style.position = 'fixed';
		input.style.top = '-1000px';
		input.style.opacity = '0';
		input.multiple = options.multiple ?? false;
		if (options.legacyAccept) {
			input.accept = options.legacyAccept;
		}

		const cleanup = () => {
			input.removeEventListener('change', handleChange);
			input.remove();
		};

		const handleChange = () => {
			try {
				const file = input.files?.[0] ?? null;
				cleanup();
				resolve(file);
			} catch (err) {
				cleanup();
				reject(err);
			}
		};

		input.addEventListener('change', handleChange, { once: true });
		document.body.appendChild(input);
		input.click();
	});
};

export const pickSingleFile = async (options: FilePickerRequest): Promise<File | null> => {
	if (typeof window === 'undefined') {
		return null;
	}

	if (isFileSystemAPISupported()) {
		return pickWithFileSystemAPI({
			...options,
			multiple: false,
		});
	}

	return pickWithInputElement({
		...options,
		multiple: false,
	});
};

export const pickProjectArchive = async (): Promise<File | null> => {
	const acceptDescriptor: FilePickerAcceptDescriptor = {
		description: 'Trackway project archive',
		accept: {
			'application/zip': ['.zip'],
			'application/json': ['.json'],
		},
	};

	return pickSingleFile({
		accept: [acceptDescriptor],
		excludeAcceptAllOption: true,
		legacyAccept: '.zip,.json',
	});
};

export type { FilePickerAcceptDescriptor, FilePickerRequest };
