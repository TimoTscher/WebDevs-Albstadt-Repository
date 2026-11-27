// Zugriff auf einzelne Elemente
const calendarMonth = document.querySelector(".calendar-month");
const calendarGrid = document.querySelector(".calendar-grid");
const nextMonthButton = document.querySelector(".cal-arrow.next");
const prevMonthButton = document.querySelector(".cal-arrow.prev");
const timeSlots = document.querySelector(".time-slots");
const reservationForm = document.querySelector(".reservation-form");
const formError = document.querySelector(".form-error");
const earlierTimeButton = document.querySelector(".time-arrow.up");
const laterTimeButton = document.querySelector(".time-arrow.down");

// Datum formatieren
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

const monthFormatter = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin"
});

const today = new Date();

const dateParts = dateFormatter.formatToParts(today);

const todayYear = Number(
    dateParts.find(part => part.type === "year").value
);

const todayMonth = Number(
    dateParts.find(part => part.type === "month").value
) - 1;

const todayDay = Number(
    dateParts.find(part => part.type === "day").value
);

const todayDate = Date.UTC(todayYear, todayMonth, todayDay);

// Aktueller Zustand der Seite
let displayedYear = todayYear;
let displayedMonth = todayMonth;
let selectedDate = null;
let selectedArea = document.querySelector(
    'input[name="seating"]:checked'
).value;
let selectedTime = null;

// TESTDATEN: noch keine Prüfung der Tischbelegung.
let testSlots = [];

// Hilfsfunktionen
// Hier wird das Datum für API formatiert
function formatDateForApi(dateValue) {
    return new Date(dateValue).toISOString().slice(0, 10);
}

// Hier wird geprüft, ob ein Zeitslot in der Zukunft liegt
function isSlotInFuture(dateValue, hour) {
    const formatter = new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    });

    const parts = formatter.formatToParts(new Date());
    const getPart = type =>
        Number(parts.find(part => part.type === type).value);

    const currentDate = Date.UTC(
        getPart("year"),
        getPart("month") - 1,
        getPart("day")
    );

    const currentMinutes = getPart("hour") * 60 + getPart("minute");

    return dateValue > currentDate ||
        (dateValue === currentDate && hour * 60 > currentMinutes);
}

// Fehlerbehandlung bei unkorrekten Eingaben
function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
}

// Kalender und Zeislots
function renderCalendar() {
    calendarMonth.textContent = monthFormatter.format(
        new Date(Date.UTC(displayedYear, displayedMonth, 1, 12))
    );

    const daysInMonth = new Date(
        Date.UTC(displayedYear, displayedMonth + 1, 0, 12)
    ).getUTCDate();

    const firstWeekday = new Date(
        Date.UTC(displayedYear, displayedMonth, 1, 12)
    ).getUTCDay();

    const emptyCells = (firstWeekday + 6) % 7;

    calendarGrid.replaceChildren();

    for (let i = 0; i < emptyCells; i++) {
        const emptyCell = document.createElement("span");
        calendarGrid.append(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayButton = document.createElement("button");

        dayButton.type = "button";
        dayButton.classList.add("cal-day");

        const buttonDate = Date.UTC(displayedYear, displayedMonth, day);

        if (buttonDate < todayDate) {
            dayButton.classList.add("muted");
            dayButton.disabled = true;
        } else if (buttonDate === selectedDate) {
            dayButton.classList.add("selected");
        } else {
            dayButton.classList.add("available");
        }
        dayButton.textContent = day;

        dayButton.addEventListener("click", () => {
            selectedDate = buttonDate;
            updateAvailability();
            renderCalendar();
        });

        calendarGrid.append(dayButton);
    }
}

function createTestSlots(dateValue) {
    const weekday = new Date(dateValue).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;

    const firstHour = isWeekend ? 11 : 12;
    const lastHour = isWeekend ? 21 : 20;
    const slots = [];

    for (let hour = firstHour; hour <= lastHour; hour++) {
        slots.push({
            uhrzeit: `${hour}:00`,
            verfuegbar: isSlotInFuture(dateValue, hour)
        });
    }

    return slots;
}

function renderTimeSlots(slots) {
    const scrollPosition = timeSlots.scrollTop;
    timeSlots.replaceChildren();

    slots.forEach(slot => {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = slot.uhrzeit;
        button.classList.add("time-slot");

        if (!slot.verfuegbar) {
            button.classList.add("muted");
            button.disabled = true;
        } 
        else {
            if (slot.uhrzeit === selectedTime) {
                button.classList.add("selected");
            } else {
                button.classList.add("available");
            }

            button.addEventListener("click", () => {
                selectedTime = slot.uhrzeit;
                renderTimeSlots(slots);
            });
        }

        timeSlots.append(button);
    });
    timeSlots.scrollTop = scrollPosition;
}

function updateAvailability() {
    selectedTime = null;
    timeSlots.scrollTop = 0;
    if (selectedDate === null) {
        renderTimeSlots([]);
        return;
    }
    testSlots = createTestSlots(selectedDate);
    renderTimeSlots(testSlots);
}

// Buttons und Ereignisse behandeln
nextMonthButton.addEventListener("click", () => {
    displayedMonth++;

    if (displayedMonth > 11) {
        displayedMonth = 0;
        displayedYear++;
    }

    renderCalendar();
});

prevMonthButton.addEventListener("click", () => {
    displayedMonth--;

    if (displayedMonth < 0) {
        displayedMonth = 11;
        displayedYear--;
    }

    renderCalendar();
});

earlierTimeButton.addEventListener("click", () => {
    timeSlots.scrollBy({
        top: -100,
        behavior: "smooth"
    });
});

laterTimeButton.addEventListener("click", () => {
    timeSlots.scrollBy({
        top: 100,
        behavior: "smooth"
    });
});

document.querySelectorAll('input[name="seating"]').forEach(radio => {
    radio.addEventListener("change", () => {
        selectedArea = radio.value;
        updateAvailability();
    });
});

// 	Formular prüfen und Daten speichern
reservationForm.addEventListener("submit", event => {
    event.preventDefault();
    
    formError.textContent = "";
    formError.hidden = true;

    if (selectedDate === null) {
        showFormError("Bitte wählen Sie ein Datum.");
        return;
    }

    if (selectedTime === null) {
        showFormError("Bitte wählen Sie eine Uhrzeit.");
        return;
    }

    const selectedHour = Number(selectedTime.split(":")[0]);

    if (!isSlotInFuture(selectedDate, selectedHour)) {
        updateAvailability();
        renderCalendar();
        showFormError("Bitte wählen Sie einen zukünftigen Termin.");
        return;
    }

    const formData = new FormData(reservationForm);

    const reservationDraft = {
        vorname: formData.get("vorname").trim(),
        nachname: formData.get("nachname").trim(),
        email: formData.get("email").trim(),
        telefon: formData.get("phone").trim(),
        personenanzahl: Number(formData.get("guests")),
        datum: formatDateForApi(selectedDate),
        uhrzeit: selectedTime,
        sitzbereich: selectedArea,
        anmerkung: formData.get("notes").trim()
    };

    if (
        reservationDraft.vorname === "" ||
        reservationDraft.nachname === ""
    ) {
        showFormError("Bitte geben Sie Ihren Vor- und Nachnamen ein.");
        return;
    }
    sessionStorage.setItem(
        "reservationDraft",
        JSON.stringify(reservationDraft)
    );
    
    window.location.href = "reservierung-pruefen.html";
});

// Seite initialisieren
renderCalendar();
renderTimeSlots([]);

// Daten wieder herstellen
const savedDraft = sessionStorage.getItem("reservationDraft");

if (savedDraft !== null) {
    const draft = JSON.parse(savedDraft);
    reservationForm.elements.namedItem("vorname").value = draft.vorname;
    reservationForm.elements.namedItem("nachname").value = draft.nachname;
    reservationForm.elements.namedItem("email").value = draft.email;
    reservationForm.elements.namedItem("phone").value = draft.telefon;
    reservationForm.elements.namedItem("guests").value = draft.personenanzahl;
    reservationForm.elements.namedItem("notes").value = draft.anmerkung;

    reservationForm.elements.namedItem("seating").value = draft.sitzbereich;
    selectedArea = draft.sitzbereich;

    const [year, month, day] = draft.datum.split("-").map(Number);

    const restoredDate = Date.UTC(year, month - 1, day);

    if (restoredDate >= todayDate) {
        selectedDate = restoredDate;
        displayedYear = year;
        displayedMonth = month - 1;

        renderCalendar();
        updateAvailability();

        if (testSlots.some(slot =>
            slot.uhrzeit === draft.uhrzeit && slot.verfuegbar
        )) {
            selectedTime = draft.uhrzeit;
            renderTimeSlots(testSlots);
        }
    } else {
        showFormError("Bitte wählen Sie ein neues Datum und eine Uhrzeit.");
    }
}