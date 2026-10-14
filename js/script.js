const SEMESTER_START = "2026-09-14";
const SEMESTER_END = "2026-12-11";

function initializeNavigation() {
    const navigation = document.querySelector(".site-nav");
    const button = document.querySelector(".menu-toggle");
    if (!button || !navigation) return;

    button.hidden = false;
    document.documentElement.classList.add("has-menu-script");

    button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
    });

    navigation.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        button.setAttribute("aria-expanded", "false");
        button.focus();
    });
}

function initializePrintButton() {
	const button = document.querySelector("#print-cv");
	if (!button) return;

	button.addEventListener("click", () => {
		window.print();
	});
}

function initializeSchedule() {
	const table = document.querySelector("#schedule-table");
	if (!table) return;

	const cells = table.querySelectorAll("td[data-type]");
	const scroll = document.querySelector(".schedule-scroll");
	const status = document.querySelector("#schedule-status");
	const clock = document.querySelector("#schedule-clock");
	const filters = document.querySelector(".schedule-filters");
	const progress = document.querySelector("#semester-progress");
	const semesterPercentage = document.querySelector("#semester-percentage");
	const note = document.querySelector("#schedule-note");
	const empty = document.querySelector("#schedule-empty");
	const semesterStatus = document.querySelector("#semester-status");
	const dayLength = 24 * 60 * 60 * 1000;
	const semesterDates = document.querySelector("#semester-dates");
	const semesterStart = Date.parse(SEMESTER_START + "T00:00:00Z");
	const semesterEnd = Date.parse(SEMESTER_END + "T00:00:00Z") + dayLength;

	if (filters) {
		filters.hidden = false;

		filters.addEventListener("click", (event) => {
			const button = event.target.closest("button[data-filter]");
			if (!button) return;

			let visibleCount = 0;

			for (const cell of cells) {
				const visible = button.dataset.filter === "all" ||
					cell.dataset.type === button.dataset.filter;

				cell.dataset.filtered = String(!visible);
				if (visible) visibleCount++;
			}

			for (const filter of filters.querySelectorAll("button")) {
				filter.setAttribute("aria-pressed", String(filter === button));
			}

			scroll.hidden = visibleCount === 0;
			if (empty){
				empty.hidden = visibleCount > 0;
				note.hidden = !(visibleCount > 0);
			}
		});
	}

	function getTimeMinutes(time) {
		const parts = time.split(":");
		return Number(parts[0]) * 60 + Number(parts[1]);
	}

	function getbratislavaTimeParts(date) {
		const formatter = new Intl.DateTimeFormat("en-GB", {
			timeZone: "Europe/Bratislava",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23"
		});

		const values = {};

		for (const part of formatter.formatToParts(date)) {
			if (part.type !== "literal") {
				values[part.type] = Number(part.value);
			}
		}

		return {
			date: Date.UTC(values.year, values.month - 1, values.day),
			minutes: values.hour * 60 + values.minute
		};
	}

	function updateSchedule() {
		const date = new Date();
		const bratislavaTimeParts = getbratislavaTimeParts(date);
		const dateTime = bratislavaTimeParts.date + bratislavaTimeParts.minutes * 60 * 1000;
		const currentDayWeek = new Date(bratislavaTimeParts.date).getUTCDay(); 
		const searchDate = Math.max(bratislavaTimeParts.date, semesterStart);
		const searchDay = new Date(searchDate).getUTCDay();
		let currentCell = null;
		let nextCell = null;
		let nextTime = Infinity;

		for (const cell of cells) {
			delete cell.dataset.current;

			const day = Number(cell.dataset.day);
			const start = getTimeMinutes(cell.dataset.start);
			const end = getTimeMinutes(cell.dataset.end);

			if (semesterStart <= dateTime && dateTime < semesterEnd &&
				currentDayWeek === day && 
				start <= bratislavaTimeParts.minutes && bratislavaTimeParts.minutes < end) {
				currentCell = cell;
				cell.dataset.current = "true";
			}		

			const daysUntilLesson = (day - searchDay + 7) % 7;
			let lessonTime = searchDate + daysUntilLesson * dayLength + start * 60 * 1000;

			if (lessonTime <= dateTime) lessonTime += 7 * dayLength;

			if (lessonTime < semesterEnd && lessonTime < nextTime) {
				nextTime = lessonTime;
				nextCell = cell;
			}
		}

		if (clock) {
			const parts = getbratislavaTimeParts(date);

			const dateText = new Date(parts.date).toLocaleDateString("en-GB", {
				timeZone: "UTC"
			}).replace(/\.\s+/g, ".");

			const hours = String(Math.floor(parts.minutes / 60)).padStart(2, "0");
			const minutes = String(parts.minutes % 60).padStart(2, "0");

			clock.textContent = `Current time in Bratislava: ${dateText}, ${hours}:${minutes}`;
		}

		if (status) {
			if (currentCell) {
				const title = currentCell.querySelector("strong").textContent.trim();
				status.textContent = `Current class: ${title} (${currentCell.dataset.start}-${currentCell.dataset.end}).`;
			} else if (nextCell) {
				const title = nextCell.querySelector("strong").textContent.trim();
				const nextDate = new Date(nextTime).toLocaleDateString("en-GB", {
					timeZone: "UTC",
					weekday: "long",
					day: "numeric",
					month: "numeric"
				}).replace(/\.\s+/g, ".");

				status.textContent = `I have no class right now. Next class: ${title}, ${nextDate} at ${nextCell.dataset.start}.`;
			} else {
				status.textContent = "I have no more classes this semester.";
			}
		}

		if (semesterDates) {
			const startParts = SEMESTER_START.split("-");
			const endParts = SEMESTER_END.split("-");
			let semesterName = "the semester";

			if (startParts[1] === "09") {
				semesterName = "the winter semester";
			} else if (startParts[1] === "02") {
				semesterName = "the summer semester";
			}

			const startDate = startParts[2] + "." + startParts[1] + "." + startParts[0];
			const endDate = endParts[2] + "." + endParts[1] + "." + endParts[0];

			semesterDates.textContent = "Teaching period of " + semesterName + ": " + startDate + " - " + endDate;
		}

		const semesterLength = semesterEnd - semesterStart;
		const elapsed = dateTime - semesterStart;
		const percent = Math.round(Math.max(0, Math.min(100, elapsed / semesterLength * 100)));

		if (progress) {
			progress.value = percent;
			progress.textContent = percent + " %";
		}

		if (semesterPercentage) {
			semesterPercentage.textContent = percent + " %";
		}

		if (semesterStatus) {
			if (dateTime < semesterStart) {
				semesterStatus.textContent = "Classes have not started yet.";
			} else if (dateTime >= semesterEnd) {
				semesterStatus.textContent = "The teaching period of the semester has ended.";
			} else {
				const week = Math.floor((bratislavaTimeParts.date - semesterStart) / (7 * dayLength)) + 1;
				semesterStatus.textContent = `I am currently in my ${week} week of study..`;
			}
		}
	}

	updateSchedule();
	setInterval(updateSchedule, 60000);
}

function initializeUniversity() {
	const university = document.querySelector(".university");
	if (!university) return;

	const points = [
		{
			title: "Entrance",
			text: "The main entrance to the faculty",
			x: 49,
			y: 73,
		},
		{
			title: "Northern Wing",
			text: "One of the long wings extending east from the faculty's main building.",
			x: 49,
			y: 37,
		},
		{
			title: "Curved Building",
			text: "The large curved building stands out among the rectangular buildings nearby. It's FIIT.",
			x: 26,
			y: 38,
		},
		{
			title: "Western Car Park",
			text: "Parking spaces beside the main faculty building, arranged in several rows.",
			x: 32,
			y: 59,
		},
		{
			title: "Circular Courtyard",
			text: "There is a cosy courtyard between the two wings of the faculty. Most of the time, the entrance to it is closed",
			x: 49,
			y: 59,
		},
		{
			title: "Eastern Access Road",
			text: "A curved access road runs along the eastern side of the faculty buildings.",
			x: 65.5,
			y: 49,
		},
		{
			title: "Campus Lawn",
			text: "An open grassy area lies south-east of the main faculty building.",
			x: 59,
			y: 80,
		},
		{
			title: "Cemetery",
			text: "There is a cemetery along the western side of the campus. Those who live in the dormitory 'Mladost' constantly walk past the cemetery.",
			x: 10,
			y: 20,
		},
		{
			title: "Bus stop",
			text: "The 'Zoo' bus stop is located on the north-east corner. It's quite an ironic name.",
			x: 76,
			y: 33,
		},
		{
			title: "Pedestrian Crossings",
			text: "Marked crossings connect the paths near the southern edge of the campus.",
			x: 34,
			y: 95,
		}
	];

	points.forEach((point, index) => {
		const number = index + 1;
		const id = "university-point-" + number;
		const hotspot = document.createElement("div");
        hotspot.classList.add("hotspot");

        hotspot.style.setProperty("--x", `${point.x}%`);
        hotspot.style.setProperty("--y", `${point.y}%`);

        if (point.x > 70) {
            hotspot.classList.add("hotspot__left");
        }
        if (point.x < 20) {
            hotspot.classList.add("hotspot__right");
        }

        const button = document.createElement("button");
        button.classList.add("hotspot__dot");
        button.type = "button";
        button.id = id;
        button.textContent = String(number);
        button.setAttribute("aria-label", point.title);

        const panel = document.createElement("div");
        panel.classList.add("hotspot__panel");

        const heading = document.createElement("h2");
        heading.textContent = point.title;

        const description = document.createElement("p");
        description.textContent = point.text;

        panel.append(heading, description);
        hotspot.append(button, panel);
		university.append(hotspot);
	});
}

function initializeMap() {
	const mapElement = document.querySelector("#map");
	if (!mapElement) return;

	const form = document.querySelector("#map-controls");
	const status = document.querySelector("#map-status");

	if (!window.L) {
		status.textContent = "I could not load the map. Check your internet connection and reload the page.";
		return;
	}

	const storageKey = "laushkin-map-points";

	const points = [
		{
			id: "school",
			name: "FEI STU",
			lat: 48.151965,
			lng: 17.072995
		},
		{
			id: "castle",
			name: "Bratislava Castle",
			lat: 48.1426089,
			lng: 17.1004343
		},
		{
			id: "michaels-gate",
			name: "Michael's Gate",
			lat: 48.1451293,
			lng: 17.1067417
		},
		{
			id: "st-martins-cathedral",
			name: "St. Martin's Cathedral",
			lat: 48.1420333,
			lng: 17.1049758
		},
		{
			id: "old-town-hall",
			name: "Old Town Hall",
			lat: 48.1436456,
			lng: 17.1087014
		},
		{
			id: "blue-church",
			name: "Blue Church",
			lat: 48.1433534,
			lng: 17.1166992
		},
		{
			id: "slavin",
			name: "Slavin War Memorial",
			lat: 48.1538959,
			lng: 17.099718
		},
		{
			id: "chatam-sofer",
			name: "Chatam Sofer Memorial",
			lat: 48.1410625,
			lng: 17.0927525
		},
		{
			id: "lafranconi-bridge",
			name: "Lafranconi Bridge",
			lat: 48.1425778,
			lng: 17.0750333
		},
		{
			id: "napoleons-hill",
			name: "Napoleon's Hill",
			lat: 48.1454911,
			lng: 17.0903749
		}
	];

	let storageMessage = "";
	let line = null;
	const markers = new Map();

	try {
		const savedPoints = JSON.parse(localStorage.getItem(storageKey) || "[]");

		if (!Array.isArray(savedPoints) || !savedPoints.every((point) =>
			point && typeof point.name === "string" && point.name.trim()
			&& point.name.length <= 80
			&& Number.isFinite(point.lat) && Math.abs(point.lat) <= 90
			&& Number.isFinite(point.lng) && Math.abs(point.lng) <= 180
		)) {
			throw new Error("Invalid saved map points");
		}

		for (const savedPoint of savedPoints) {
			if (savedPoint.id === "school" || savedPoint.id === "home" ||
				savedPoint.id === "castle" || savedPoint.id === "michaels-gate" ||
				savedPoint.id === "st-martins-cathedral" || savedPoint.id === "old-town-hall" ||
				savedPoint.id === "blue-church" || savedPoint.id === "slavin" ||
				savedPoint.id === "chatam-sofer" || savedPoint.id === "lafranconi-bridge" ||
				savedPoint.id === "napoleons-hill") {
				continue;
			}

			savedPoint.id = "point-" + points.length;
			points.push(savedPoint);
		}

	} catch {
		storageMessage = "I could not load the saved points. You can add new points.";
	}

	const map = L.map(mapElement).setView([48.144, 17.108], 14);

	L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	function createPopup(text) {
		const paragraph = document.createElement("p");
		paragraph.textContent = text;
	    paragraph.style.whiteSpace = "pre-line";
		return paragraph;
	}

	function getMapDistance(start, end) {
		const radians = Math.PI / 180;
		const latitudeDifference = (end.lat - start.lat) * radians;
		const longitudeDifference = (end.lng - start.lng) * radians;

		const value = Math.sin(latitudeDifference / 2) ** 2
			+ Math.cos(start.lat * radians) * Math.cos(end.lat * radians)
			* Math.sin(longitudeDifference / 2) ** 2;

		return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, value)));
	}

	function showDistance() {
		const start = points.find(
			(point) => point.id === form.elements.point.value
		);

		const end = points.find(
			(point) => point.id === form.elements.destination.value
		);

		if (!start || !end) {
			status.textContent = "Select a starting point and a destination.";
			return;
		}

		const distance = getMapDistance(start, end).toFixed(2);

		const route =
			`${start.name} → ${end.name}:\n` +
			`${distance} km in a straight line.`;

		status.textContent = `${route} ${storageMessage}`;
		status.style.whiteSpace = "pre-line";

		if (line) {
			map.removeLayer(line);
			line = null;
		}

		points.forEach((point) => {
			let text =
				`${point.name}\n` +
				`${point.lat.toFixed(5)}°, ${point.lng.toFixed(5)}°`;

			if (point.id === start.id || point.id === end.id) {
				text = 
					`${point.name}\n` + 
					`${route}`;
			}

			markers.get(point.id).bindPopup(createPopup(text));
		});

		if (start.id !== end.id) {
			line = L.polyline([
				[start.lat, start.lng],
				[end.lat, end.lng]
			], {
				color: getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim(),
				weight: 4,
				dashArray: "8, 6"
			}).addTo(map);

			map.fitBounds(line.getBounds(), {
				padding: [30, 30],
				maxZoom: 15
			});
		} else {
			map.panTo([end.lat, end.lng]);
		}

		markers.get(end.id).openPopup();
	}

	function showPoint(point) {
		const marker = L.marker([point.lat, point.lng], {
			title: point.name,
			alt: point.name
		})
			.addTo(map)
			.bindPopup(createPopup(
				`${point.name}\n` +
				`${point.lat.toFixed(5)}°, ${point.lng.toFixed(5)}°`
			));

		markers.set(point.id, marker);

		form.elements.point.add(
			new Option(point.name, point.id)
		);

		form.elements.destination.add(
			new Option(point.name, point.id)
		);
	}

	form.elements.point.replaceChildren();
	form.elements.destination.replaceChildren();

	points.forEach(showPoint);

	form.elements.point.value = "castle";
	form.elements.destination.value = "michaels-gate";

	function addPoint(coordinates) {
		const location = coordinates.wrap();

		const temporaryMarker = L.marker([location.lat, location.lng], {
			title: "New place",
			alt: "New place"
		}).addTo(map);

		const popupForm = document.createElement("form");
		popupForm.className = "map-point-form";

		popupForm.innerHTML = `
			<h3>New place</h3>
			<p>${location.lat.toFixed(5)}°, ${location.lng.toFixed(5)}°</p>

			<label>
				What should I call this place?
				<input type="text" name="name" placeholder="E.g. library" maxlength="80" required>
			</label>

			<button type="submit">Save place</button>
			<button type="button">Cancel</button>
		`;

		const input = popupForm.querySelector("input");

		input.addEventListener("input", () => {
			input.setCustomValidity("");
		});

		popupForm.addEventListener("submit", (event) => {
			event.preventDefault();
			const name = input.value.trim();

			if (!name || name.length > 80) {
				input.setCustomValidity("Enter a point name with 1 to 80 characters.");
				input.reportValidity();
				return;
			}

			temporaryMarker.closePopup();

			const point = {
				id: "point-" + points.length,
				name,
				lat: location.lat,
				lng: location.lng
			};

			points.push(point);
			showPoint(point);

			form.elements.point.value = point.id;

			try {
				localStorage.setItem(storageKey, JSON.stringify(points));
				storageMessage = "";
			} catch {
				storageMessage = "I could not save the points. New points will be lost when you reload the page.";
			}

			showDistance();
		});

		popupForm.querySelector('button[type="button"]').addEventListener("click", () => {
			temporaryMarker.closePopup();
		});

		popupForm.addEventListener("keydown", (event) => {
			if (event.key !== "Escape") return;

			event.preventDefault();
			event.stopPropagation();
			temporaryMarker.closePopup();
		});

		temporaryMarker.bindPopup(popupForm, {
			minWidth: 200,
			maxWidth: 320
		});

		temporaryMarker.on("popupopen", () => {
			input.focus({ preventScroll: true });
		});

		temporaryMarker.on("popupclose", () => {
			temporaryMarker.unbindPopup();
			map.removeLayer(temporaryMarker);
			mapElement.focus({ preventScroll: true });
		});

		temporaryMarker.openPopup();
	}

	map.on("click", (event) => addPoint(event.latlng));

	mapElement.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" || event.target !== mapElement) return;
		event.preventDefault();
		addPoint(map.getCenter());
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		showDistance();
	});

}

initializeNavigation();
initializePrintButton();
initializeSchedule();
initializeUniversity();
initializeMap();
