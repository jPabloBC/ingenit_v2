"use client";

import {
	ArrowLeft,
	ClipboardList,
	Plus,
	Printer,
	RefreshCw,
	Shuffle,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Person = {
	id: string;
	full_name: string;
	is_active: boolean;
};

type Group = {
	id: string;
	name: string;
	sort_order: number;
	is_active: boolean;
};

type Task = {
	id: string;
	group_id: string | null;
	label: string;
	slots: number;
	sort_order: number;
	is_active: boolean;
};

type Assignment = {
	id: string;
	assignment_date: string;
	task_id: string;
	person_id: string;
};

function getChileDate(): string {
	return new Date().toLocaleDateString("sv-SE", {
		timeZone: "America/Santiago",
	});
}

function toDateOnly(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function getWeekStart(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	const day = d.getUTCDay();
	const diff = (day + 6) % 7;
	d.setUTCDate(d.getUTCDate() - diff);
	return toDateOnly(d);
}

function addDays(dateStr: string, days: number): string {
	const d = new Date(`${dateStr}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return toDateOnly(d);
}

function formatDateHeading(dateStr: string): string {
	const safeDate = dateStr || getChileDate();
	const d = new Date(`${safeDate}T12:00:00-03:00`);
	const formatted = new Intl.DateTimeFormat("es-CL", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric",
		timeZone: "America/Santiago",
	}).format(d);
	return formatted.toUpperCase();
}

function _formatShortDate(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00-03:00`);
	return new Intl.DateTimeFormat("es-CL", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "America/Santiago",
	}).format(d);
}

function formatWeekRangeLabel(startDate: string, endDate: string): string {
	const start = new Date(`${startDate}T12:00:00-03:00`);
	const end = new Date(`${endDate}T12:00:00-03:00`);
	const sameMonth =
		start.getMonth() === end.getMonth() &&
		start.getFullYear() === end.getFullYear();
	const dayFormatter = new Intl.DateTimeFormat("es-CL", {
		day: "2-digit",
		timeZone: "America/Santiago",
	});
	const monthFormatter = new Intl.DateTimeFormat("es-CL", {
		month: "long",
		timeZone: "America/Santiago",
	});
	const startDay = dayFormatter.format(start);
	const endDay = dayFormatter.format(end);
	const startMonth = monthFormatter.format(start);
	const endMonth = monthFormatter.format(end);
	if (sameMonth) {
		return `${startDay} al ${endDay} de ${startMonth}`;
	}
	return `${startDay} de ${startMonth} al ${endDay} de ${endMonth}`;
}

function formatWeekdayHeader(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00-03:00`);
	return new Intl.DateTimeFormat("es-CL", {
		weekday: "long",
		timeZone: "America/Santiago",
	}).format(d);
}

function formatDateParen(dateStr: string): string {
	const d = new Date(`${dateStr}T12:00:00-03:00`);
	return new Intl.DateTimeFormat("es-CL", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "America/Santiago",
	})
		.format(d)
		.replace(/\//g, "-");
}

function formatTaskLabelForCell(label: string): string {
	return label.split(/\r?\n/).slice(0, 2).join("\n");
}

export default function PrintAssignmentsPage() {
	const router = useRouter();
	const [date, setDate] = useState(getChileDate());
	const [viewMode, setViewMode] = useState<"day" | "week">("day");
	const [loading, setLoading] = useState(false);
	const [people, setPeople] = useState<Person[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [assignments, setAssignments] = useState<Assignment[]>([]);
	const [error, setError] = useState<string | null>(null);

	const [newPersonName, setNewPersonName] = useState("");
	const [newGroupName, setNewGroupName] = useState("");
	const [newTaskLabel, setNewTaskLabel] = useState("");
	const [newTaskGroupId, setNewTaskGroupId] = useState<string | null>(null);
	const [newTaskSlots, setNewTaskSlots] = useState(1);
	const [newTaskSortOrder, setNewTaskSortOrder] = useState<number | null>(null);
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [editingCell, setEditingCell] = useState<{
		date: string;
		taskId: string;
	} | null>(null);
	const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
	const [savingCell, setSavingCell] = useState(false);

	const loadAll = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const weekStart = getWeekStart(date);
			const params = new URLSearchParams();
			params.set("date", date);
			params.set("mode", viewMode);
			if (viewMode === "week") params.set("start", weekStart);
			const res = await fetch(
				`/api/admin/print/assignments?${params.toString()}`,
			);
			const payload = await res.json();
			if (!res.ok) throw new Error(payload?.error || "Error cargando datos");
			setPeople(payload.people || []);
			setGroups(payload.groups || []);
			setTasks(payload.tasks || []);
			setAssignments(payload.assignments || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [date, viewMode]);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	const peopleById = useMemo(() => {
		return new Map(people.map((p) => [p.id, p]));
	}, [people]);

	const assignmentsByTask = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const a of assignments) {
			const name = peopleById.get(a.person_id)?.full_name || "Sin nombre";
			if (!map.has(a.task_id)) map.set(a.task_id, []);
			map.get(a.task_id)?.push(name);
		}
		return map;
	}, [assignments, peopleById]);

	const assignmentsByDateTask = useMemo(() => {
		const map = new Map<string, Map<string, string[]>>();
		for (const a of assignments) {
			const dateKey = a.assignment_date;
			const name = peopleById.get(a.person_id)?.full_name || "Sin nombre";
			if (!map.has(dateKey)) map.set(dateKey, new Map());
			const taskMap = map.get(dateKey) as Map<string, string[]>;
			if (!taskMap.has(a.task_id)) taskMap.set(a.task_id, []);
			taskMap.get(a.task_id)?.push(name);
		}
		return map;
	}, [assignments, peopleById]);

	const activeGroups = useMemo(() => {
		return [...groups]
			.filter((g) => g.is_active)
			.sort((a, b) => {
				if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
				return a.name.localeCompare(b.name);
			});
	}, [groups]);

	const activeTasks = useMemo(() => {
		return [...tasks]
			.filter((t) => t.is_active)
			.sort((a, b) => {
				if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
				return a.label.localeCompare(b.label);
			});
	}, [tasks]);

	const tasksByGroup = (groupId: string | null) => {
		return activeTasks.filter((t) => t.group_id === groupId);
	};

	const taskById = useMemo(() => {
		return new Map(tasks.map((t) => [t.id, t]));
	}, [tasks]);

	const orderedTasks = useMemo(() => {
		return [...tasks].sort((a, b) => {
			if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
			return a.label.localeCompare(b.label);
		});
	}, [tasks]);

	const weekDays = useMemo(() => {
		const start = getWeekStart(date);
		return Array.from({ length: 5 }).map((_, idx) => addDays(start, idx));
	}, [date]);

	const nextTaskOrder = useMemo(() => {
		const maxOrder = tasks.reduce(
			(max, task) => Math.max(max, task.sort_order ?? 0),
			0,
		);
		return maxOrder + 1;
	}, [tasks]);

	useEffect(() => {
		if (!editingTaskId) {
			setNewTaskSortOrder((current) =>
				current === null ? nextTaskOrder : current,
			);
		}
	}, [editingTaskId, nextTaskOrder]);

	const renderDailyContent = () => (
		<>
			<h2 className="text-lg font-semibold text-gray-900 mb-4">
				{formatDateHeading(date)}
			</h2>
			{activeGroups.length === 0 && tasksByGroup(null).length === 0 ? (
				<p className="text-gray-500">No hay grupos o tareas activas.</p>
			) : (
				<div className="space-y-5">
					{activeGroups.map((group) => (
						<div key={group.id}>
							<h3 className="text-base font-semibold text-gray-800 mb-2">
								{group.name}
							</h3>
							<ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
								{tasksByGroup(group.id).map((task) => {
									const names = assignmentsByTask.get(task.id) || [];
									return (
										<li key={task.id}>
											<span className="whitespace-pre-line">{task.label}</span>{" "}
											— {names.length > 0 ? names.join(" - ") : "Sin asignar"}
										</li>
									);
								})}
							</ul>
						</div>
					))}

					{tasksByGroup(null).length > 0 && (
						<div>
							<h3 className="text-base font-semibold text-gray-800 mb-2">
								Sin grupo
							</h3>
							<ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
								{tasksByGroup(null).map((task) => {
									const names = assignmentsByTask.get(task.id) || [];
									return (
										<li key={task.id}>
											<span className="whitespace-pre-line">{task.label}</span>{" "}
											— {names.length > 0 ? names.join(" - ") : "Sin asignar"}
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</div>
			)}
		</>
	);

	const renderWeeklyTables = (showEdit: boolean) => (
		<div className="overflow-x-auto flex-1 min-h-0">
			<table className="w-full border-separate [border-spacing:0_6px] text-sm table-fixed h-full">
				<thead className="bg-black text-white">
					<tr>
						<th className="border border-black/70 px-3 py-2 text-center font-semibold w-64 align-middle rounded-none">
							<div className="leading-tight relative -top-1.5">
								<div>Designación de Sectores</div>
								<div className="text-xs font-medium">
									(Recreo 10:20 - 10:40)
								</div>
							</div>
						</th>
						{weekDays.map((day) => (
							<th
								key={day}
								className="border border-black/70 px-3 py-2 text-center font-semibold align-middle rounded-none"
							>
								<div className="leading-tight relative -top-1.5">
									<div className="capitalize">{formatWeekdayHeader(day)}</div>
									<div className="text-xs font-medium">
										({formatDateParen(day)})
									</div>
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{activeTasks.map((task) => (
						<tr key={task.id}>
							<td className="border border-black/60 px-3 py-4 font-medium bg-red-700 text-white align-middle rounded-none">
								<div className="h-full flex items-center relative -top-1.5">
									<span className="block whitespace-pre-wrap break-words leading-[1.35] font-bold">
										{formatTaskLabelForCell(task.label)}
									</span>
								</div>
							</td>
							{weekDays.map((day) => {
								const names =
									assignmentsByDateTask.get(day)?.get(task.id) || [];
								return (
									<td
										key={day}
										className="border border-black/40 px-3 py-4 text-gray-900 bg-white align-middle rounded-none"
									>
										<div className="h-full flex items-center justify-between gap-2 relative -top-1.5">
											<span className="flex-1 text-center whitespace-nowrap leading-[1.35]">
												{names.length > 0 ? names.join(" - ") : "—"}
											</span>
											{showEdit && (
												<button
													type="button"
													onClick={() => openEditCell(day, task.id)}
													className="text-xs px-2 py-1 rounded bg-black/5 hover:bg-black/10 print-hidden"
												>
													Editar
												</button>
											)}
										</div>
									</td>
								);
							})}
						</tr>
					))}
					{activeTasks.length === 0 && (
						<tr>
							<td
								className="border border-black/60 px-3 py-2 text-gray-700 bg-white"
								colSpan={weekDays.length + 1}
							>
								No hay tareas activas.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);

	const renderWeeklyContent = (showEdit: boolean) => (
		<div className="space-y-4 h-full flex flex-col px-3 py-2 border border-black">
			<div className="print-title text-xl font-semibold text-gray-900 text-center">
				Rol de la Semana (
				{formatWeekRangeLabel(
					getWeekStart(date),
					addDays(getWeekStart(date), 4),
				)}
				)
			</div>
			<div className="mx-auto w-fit rounded-md border border-red-600 bg-white px-3 py-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-black text-center relative -top-1.5">
					<div className="space-y-1 text-sm">
						<p>
							<span className="font-semibold">Encargada de la Semana:</span>{" "}
							<span className="font-normal">Danitza Villarroel Q.</span>
						</p>
						<p>
							<span className="font-semibold">
								Encargada de la Amplificación:
							</span>{" "}
							<span className="font-normal">Lica - Marcia</span>
						</p>
					</div>
					<div className="space-y-1 text-sm">
						<p>
							<span className="font-semibold">
								Sacar y guardar Amplificación:
							</span>{" "}
							<span className="font-normal">Katia - Yesenia</span>
						</p>
						<p>
							<span className="font-semibold">
								Encargada de Bandera y Estandarte:
							</span>{" "}
							<span className="font-normal">Danitza</span>
						</p>
					</div>
				</div>
			</div>
			{activeTasks.length === 0 ? (
				<p className="text-gray-500">No hay grupos o tareas activas.</p>
			) : (
				renderWeeklyTables(showEdit)
			)}
		</div>
	);

	const handleGenerate = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/print/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "generate", date }),
			});
			const payload = await res.json();
			if (!res.ok)
				throw new Error(payload?.error || "Error generando asignaciones");
			setAssignments(payload.assignments || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleGenerateWeek = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/print/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "generate_week", date }),
			});
			const payload = await res.json();
			if (!res.ok)
				throw new Error(
					payload?.error || "Error generando asignaciones de la semana",
				);
			setAssignments(payload.assignments || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const openEditCell = (day: string, taskId: string) => {
		const currentPeopleIds = assignments
			.filter((a) => a.assignment_date === day && a.task_id === taskId)
			.map((a) => a.person_id);
		setSelectedPeople(currentPeopleIds);
		setEditingCell({ date: day, taskId });
	};

	const closeEditCell = () => {
		setEditingCell(null);
		setSelectedPeople([]);
	};

	const handleSaveCell = async () => {
		if (!editingCell) return;
		setSavingCell(true);
		try {
			const res = await fetch("/api/admin/print/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "set_cell",
					date: editingCell.date,
					task_id: editingCell.taskId,
					person_ids: selectedPeople,
				}),
			});
			const payload = await res.json();
			if (!res.ok)
				throw new Error(payload?.error || "Error guardando asignación");

			setAssignments((prev) => {
				const filtered = prev.filter(
					(a) =>
						!(
							a.assignment_date === editingCell.date &&
							a.task_id === editingCell.taskId
						),
				);
				const created = (payload.assignments || []) as Assignment[];
				return [...filtered, ...created];
			});
			closeEditCell();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSavingCell(false);
		}
	};

	const handleClearAssignments = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/print/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: viewMode === "week" ? "clear_week" : "clear",
					date,
				}),
			});
			const payload = await res.json();
			if (!res.ok)
				throw new Error(payload?.error || "Error limpiando asignaciones");
			setAssignments([]);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadPdf = async () => {
		try {
			const preview = document.getElementById("print-preview");
			if (!preview) {
				setError("No se encontró el preview para exportar.");
				return;
			}
			const { default: html2canvas } = await import("html2canvas");
			const { jsPDF } = await import("jspdf");

			const clone = preview.cloneNode(true) as HTMLElement;
			clone.style.position = "fixed";
			clone.style.left = "-10000px";
			clone.style.top = "0";
			clone.style.width = "1056px";
			clone.style.height = "auto";
			clone.style.maxWidth = "1056px";
			clone.style.aspectRatio = "auto";
			clone.style.background = "#ffffff";
			clone.style.overflow = "visible";
			clone.style.borderRadius = "0";
			clone.style.boxShadow = "none";
			clone.style.border = "none";

			// El div interno tiene h-full que colapsa si el padre no tiene altura fija
			const innerWrapper = clone.querySelector("div") as HTMLElement | null;
			if (innerWrapper) {
				innerWrapper.style.height = "auto";
			}

			document.body.appendChild(clone);
			await new Promise((resolve) => setTimeout(resolve, 150));

			const naturalHeight = clone.scrollHeight;

			const canvas = await html2canvas(clone, {
				scale: 2,
				width: 1056,
				height: naturalHeight,
				windowWidth: 1056,
				windowHeight: naturalHeight,
				backgroundColor: "#ffffff",
				useCORS: true,
			});
			document.body.removeChild(clone);

			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF({
				orientation: "landscape",
				unit: "pt",
				format: "letter",
			});
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();

			const globalMargin = 18;
			const targetWidth = pageWidth - globalMargin * 2;
			const targetHeight = pageHeight - globalMargin * 2;
			const ratio = Math.min(
				targetWidth / canvas.width,
				targetHeight / canvas.height,
			);
			const finalWidth = canvas.width * ratio;
			const finalHeight = canvas.height * ratio;
			const offsetX = globalMargin + (targetWidth - finalWidth) / 2;
			const offsetY = globalMargin;

			pdf.addImage(imgData, "PNG", offsetX, offsetY, finalWidth, finalHeight);
			pdf.save(`rol-semana-${getWeekStart(date)}.pdf`);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const handleAddPerson = async () => {
		const name = newPersonName.trim();
		if (!name) return;
		const res = await fetch("/api/admin/print/people", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ full_name: name }),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error creando persona");
			return;
		}
		setPeople((prev) => [...prev, payload.person]);
		setNewPersonName("");
	};

	const handleTogglePerson = async (person: Person) => {
		const res = await fetch("/api/admin/print/people", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: person.id, is_active: !person.is_active }),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error actualizando persona");
			return;
		}
		setPeople((prev) =>
			prev.map((p) => (p.id === person.id ? payload.person : p)),
		);
	};

	const handleDeletePerson = async (person: Person) => {
		const res = await fetch(
			`/api/admin/print/people?id=${encodeURIComponent(person.id)}`,
			{
				method: "DELETE",
			},
		);
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error eliminando persona");
			return;
		}
		setPeople((prev) => prev.filter((p) => p.id !== person.id));
	};

	const handleAddGroup = async () => {
		const name = newGroupName.trim();
		if (!name) return;
		const res = await fetch("/api/admin/print/task-groups", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error creando grupo");
			return;
		}
		setGroups((prev) => [...prev, payload.group]);
		setNewGroupName("");
	};

	const handleToggleGroup = async (group: Group) => {
		const res = await fetch("/api/admin/print/task-groups", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: group.id, is_active: !group.is_active }),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error actualizando grupo");
			return;
		}
		setGroups((prev) =>
			prev.map((g) => (g.id === group.id ? payload.group : g)),
		);
	};

	const handleDeleteGroup = async (group: Group) => {
		const res = await fetch(
			`/api/admin/print/task-groups?id=${encodeURIComponent(group.id)}`,
			{
				method: "DELETE",
			},
		);
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error eliminando grupo");
			return;
		}
		setGroups((prev) => prev.filter((g) => g.id !== group.id));
	};

	const handleAddTask = async () => {
		const label = newTaskLabel.trim();
		if (!label) return;
		const isEditing = Boolean(editingTaskId);
		const sortOrderValue =
			typeof newTaskSortOrder === "number" ? newTaskSortOrder : nextTaskOrder;
		const res = await fetch("/api/admin/print/tasks", {
			method: isEditing ? "PUT" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: editingTaskId || undefined,
				label,
				group_id: newTaskGroupId,
				slots: newTaskSlots,
				sort_order: sortOrderValue,
			}),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(
				payload?.error ||
					(isEditing ? "Error actualizando tarea" : "Error creando tarea"),
			);
			return;
		}
		if (isEditing) {
			setTasks((prev) =>
				prev.map((t) => (t.id === payload.task.id ? payload.task : t)),
			);
		} else {
			setTasks((prev) => [...prev, payload.task]);
		}
		setNewTaskLabel("");
		setNewTaskSlots(1);
		setNewTaskGroupId(null);
		setNewTaskSortOrder(null);
		setEditingTaskId(null);
	};

	const handleToggleTask = async (task: Task) => {
		const res = await fetch("/api/admin/print/tasks", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: task.id, is_active: !task.is_active }),
		});
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error actualizando tarea");
			return;
		}
		setTasks((prev) => prev.map((t) => (t.id === task.id ? payload.task : t)));
	};

	const handleDeleteTask = async (task: Task) => {
		const res = await fetch(
			`/api/admin/print/tasks?id=${encodeURIComponent(task.id)}`,
			{
				method: "DELETE",
			},
		);
		const payload = await res.json();
		if (!res.ok) {
			setError(payload?.error || "Error eliminando tarea");
			return;
		}
		setTasks((prev) => prev.filter((t) => t.id !== task.id));
	};

	const handleMoveTask = async (taskId: string, direction: "up" | "down") => {
		const ordered = [...tasks].sort((a, b) => {
			if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
			return a.label.localeCompare(b.label);
		});
		const index = ordered.findIndex((t) => t.id === taskId);
		if (index === -1) return;
		const swapIndex = direction === "up" ? index - 1 : index + 1;
		if (swapIndex < 0 || swapIndex >= ordered.length) return;

		const current = ordered[index];
		const target = ordered[swapIndex];

		const currentOrder = current.sort_order ?? index + 1;
		const targetOrder = target.sort_order ?? swapIndex + 1;
		const swapCurrentOrder =
			currentOrder === targetOrder ? swapIndex + 1 : targetOrder;
		const swapTargetOrder =
			currentOrder === targetOrder ? index + 1 : currentOrder;

		const resCurrent = await fetch("/api/admin/print/tasks", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: current.id, sort_order: swapCurrentOrder }),
		});
		const payloadCurrent = await resCurrent.json();
		if (!resCurrent.ok) {
			setError(payloadCurrent?.error || "Error actualizando orden de tarea");
			return;
		}

		const resTarget = await fetch("/api/admin/print/tasks", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: target.id, sort_order: swapTargetOrder }),
		});
		const payloadTarget = await resTarget.json();
		if (!resTarget.ok) {
			setError(payloadTarget?.error || "Error actualizando orden de tarea");
			return;
		}

		setTasks((prev) =>
			prev.map((t) => {
				if (t.id === current.id) return payloadCurrent.task;
				if (t.id === target.id) return payloadTarget.task;
				return t;
			}),
		);
	};

	const handleEditTask = (task: Task) => {
		setEditingTaskId(task.id);
		setNewTaskLabel(task.label || "");
		setNewTaskGroupId(task.group_id || null);
		setNewTaskSlots(task.slots || 1);
		setNewTaskSortOrder(
			typeof task.sort_order === "number" ? task.sort_order : 0,
		);
	};

	const handleCancelEditTask = () => {
		setEditingTaskId(null);
		setNewTaskLabel("");
		setNewTaskGroupId(null);
		setNewTaskSlots(1);
		setNewTaskSortOrder(null);
	};

	return (
		<main className="min-h-screen bg-gray-50 text-gray-900 font-body">
			<style jsx global>{`
        @page {
          size: letter landscape;
          margin: 12mm;
        }
        @media print {
          .print-hidden {
            display: none !important;
          }
          .print-area {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-title {
            display: block !important;
          }
        }
        #print-preview :is(h1, h2, h3, h4, h5, h6, p, span, li, strong, small) {
          position: relative;
          top: -1px;
        }
        #print-preview table,
        #print-preview th,
        #print-preview td {
          border-radius: 0 !important;
        }
      `}</style>
			<div className="max-w-full mx-auto p-4 sm:p-8">
				<div className="flex items-center gap-3 mb-6 print-hidden">
					<button
						type="button"
						onClick={() => router.push("/admin/print")}
						className="p-2 hover:bg-gray-100 rounded-md transition-colors"
						aria-label="Volver"
					>
						<ArrowLeft className="w-5 h-5 text-gray-600" />
					</button>
					<h1 className="text-2xl font-title text-gray-900 flex items-center gap-2">
						<ClipboardList className="w-6 h-6 text-cyan-600" />
						Asignación de Tareas
					</h1>
				</div>

				{error && (
					<div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg print-hidden">
						{error}
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm">
						<div className="p-5 border-b border-gray-100 flex flex-col gap-4 print-hidden">
							<div className="flex flex-wrap items-center gap-3">
								<span className="text-sm font-medium text-gray-700">Vista</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setViewMode("day")}
										className={`px-3 py-2 text-sm rounded-md border ${
											viewMode === "day"
												? "bg-cyan-600 text-white border-cyan-600"
												: "bg-white text-gray-700 border-gray-300"
										}`}
									>
										Día
									</button>
									<button
										type="button"
										onClick={() => setViewMode("week")}
										className={`px-3 py-2 text-sm rounded-md border ${
											viewMode === "week"
												? "bg-cyan-600 text-white border-cyan-600"
												: "bg-white text-gray-700 border-gray-300"
										}`}
									>
										Semana
									</button>
								</div>
								<label
									htmlFor="assignment-date"
									className="text-sm font-medium text-gray-700"
								>
									Fecha
								</label>
								<input
									id="assignment-date"
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
								<button
									type="button"
									onClick={loadAll}
									className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
								>
									<RefreshCw className="w-4 h-4" />
									Refrescar
								</button>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								{viewMode === "day" && (
									<button
										type="button"
										onClick={handleGenerate}
										className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
										disabled={loading}
									>
										<Shuffle className="w-4 h-4" />
										Generar aleatorio
									</button>
								)}
								{viewMode === "week" && (
									<button
										type="button"
										onClick={handleGenerateWeek}
										className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
										disabled={loading}
									>
										<Shuffle className="w-4 h-4" />
										Generar semana
									</button>
								)}
								<button
									type="button"
									onClick={handleClearAssignments}
									className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									disabled={loading}
								>
									{viewMode === "week"
										? "Limpiar semana"
										: "Limpiar asignaciones"}
								</button>
								<button
									type="button"
									onClick={handleDownloadPdf}
									className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
								>
									<Printer className="w-4 h-4" />
									Descargar PDF
								</button>
							</div>
						</div>

						<div className="p-6 print-area">
							{viewMode === "day"
								? renderDailyContent()
								: renderWeeklyContent(true)}
						</div>
					</section>

					<section className="bg-white border border-gray-200 rounded-xl shadow-sm">
						<div className="p-5 border-b border-gray-100 flex items-center gap-2">
							<Users className="w-5 h-5 text-cyan-600" />
							<h3 className="font-semibold text-gray-900">Personas</h3>
						</div>
						<div className="p-5 space-y-4">
							<div className="flex gap-2">
								<input
									value={newPersonName}
									onChange={(e) => setNewPersonName(e.target.value)}
									placeholder="Nombre completo"
									className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
								<button
									type="button"
									onClick={handleAddPerson}
									className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
								>
									<Plus className="w-4 h-4" />
									Agregar
								</button>
							</div>
							<div className="space-y-2 max-h-80 overflow-auto">
								{people.map((person) => (
									<div
										key={person.id}
										className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
									>
										<div>
											<p className="text-sm font-medium text-gray-800">
												{person.full_name}
											</p>
											<p className="text-xs text-gray-500">
												{person.is_active ? "Activo" : "Inactivo"}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleTogglePerson(person)}
												className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
											>
												{person.is_active ? "Desactivar" : "Activar"}
											</button>
											<button
												type="button"
												onClick={() => handleDeletePerson(person)}
												className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										</div>
									</div>
								))}
								{people.length === 0 && (
									<p className="text-sm text-gray-500">
										No hay personas registradas.
									</p>
								)}
							</div>
						</div>
					</section>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print-hidden">
					<section className="bg-white border border-gray-200 rounded-xl shadow-sm">
						<div className="p-5 border-b border-gray-100 flex items-center gap-2">
							<ClipboardList className="w-5 h-5 text-blue-600" />
							<h3 className="font-semibold text-gray-900">Grupos</h3>
						</div>
						<div className="p-5 space-y-4">
							<div className="flex gap-2">
								<input
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									placeholder="Nombre del grupo"
									className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
								<button
									type="button"
									onClick={handleAddGroup}
									className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
								>
									<Plus className="w-4 h-4" />
									Agregar
								</button>
							</div>
							<div className="space-y-2 max-h-80 overflow-auto">
								{groups.map((group) => (
									<div
										key={group.id}
										className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
									>
										<div>
											<p className="text-sm font-medium text-gray-800">
												{group.name}
											</p>
											<p className="text-xs text-gray-500">
												{group.is_active ? "Activo" : "Inactivo"}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleToggleGroup(group)}
												className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
											>
												{group.is_active ? "Desactivar" : "Activar"}
											</button>
											<button
												type="button"
												onClick={() => handleDeleteGroup(group)}
												className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										</div>
									</div>
								))}
								{groups.length === 0 && (
									<p className="text-sm text-gray-500">
										No hay grupos registrados.
									</p>
								)}
							</div>
						</div>
					</section>

					<section className="bg-white border border-gray-200 rounded-xl shadow-sm">
						<div className="p-5 border-b border-gray-100 flex items-center gap-2">
							<ClipboardList className="w-5 h-5 text-emerald-600" />
							<h3 className="font-semibold text-gray-900">Tareas</h3>
						</div>
						<div className="p-5 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								<textarea
									value={newTaskLabel}
									onChange={(e) => setNewTaskLabel(e.target.value)}
									placeholder="Nombre de la tarea (puedes usar saltos de línea)"
									className="border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[44px] resize-y"
								/>
								<select
									value={newTaskGroupId || ""}
									onChange={(e) => setNewTaskGroupId(e.target.value || null)}
									className="border border-gray-300 rounded-md px-3 py-2 text-sm"
								>
									<option value="">Sin grupo</option>
									{groups.map((g) => (
										<option key={g.id} value={g.id}>
											{g.name}
										</option>
									))}
								</select>
								<input
									type="number"
									min={1}
									value={newTaskSlots}
									onChange={(e) =>
										setNewTaskSlots(Math.max(1, Number(e.target.value)))
									}
									className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									placeholder="Cupos"
								/>
								<input
									type="number"
									min={0}
									value={newTaskSortOrder ?? nextTaskOrder}
									onChange={(e) => setNewTaskSortOrder(Number(e.target.value))}
									className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									placeholder="Orden"
								/>
								<button
									type="button"
									onClick={handleAddTask}
									className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
								>
									<Plus className="w-4 h-4" />
									{editingTaskId ? "Guardar cambios" : "Agregar tarea"}
								</button>
								{editingTaskId && (
									<button
										type="button"
										onClick={handleCancelEditTask}
										className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Cancelar
									</button>
								)}
							</div>
							<div className="space-y-2 max-h-80 overflow-auto">
								{orderedTasks.map((task) => (
									<div
										key={task.id}
										className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
									>
										<div>
											<p className="text-sm font-medium text-gray-800">
												{task.label}
											</p>
											<p className="text-xs text-gray-500">
												{task.is_active ? "Activa" : "Inactiva"} • Cupos:{" "}
												{task.slots} • Orden: {task.sort_order}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleMoveTask(task.id, "up")}
												className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
												title="Subir"
											>
												↑
											</button>
											<button
												type="button"
												onClick={() => handleMoveTask(task.id, "down")}
												className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
												title="Bajar"
											>
												↓
											</button>
											<button
												type="button"
												onClick={() => handleEditTask(task)}
												className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
											>
												Editar
											</button>
											<button
												type="button"
												onClick={() => handleToggleTask(task)}
												className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
											>
												{task.is_active ? "Desactivar" : "Activar"}
											</button>
											<button
												type="button"
												onClick={() => handleDeleteTask(task)}
												className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										</div>
									</div>
								))}
								{tasks.length === 0 && (
									<p className="text-sm text-gray-500">
										No hay tareas registradas.
									</p>
								)}
							</div>
						</div>
					</section>
				</div>

				<section className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm print-hidden">
					<div className="p-5 border-b border-gray-100 flex items-center justify-between">
						<div>
							<h3 className="text-base font-semibold text-gray-900">
								Vista previa PDF
							</h3>
							<p className="text-xs text-gray-500">
								Formato landscape (Letter)
							</p>
						</div>
						<button
							type="button"
							onClick={handleDownloadPdf}
							className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
						>
							<Printer className="w-4 h-4" />
							Descargar PDF
						</button>
					</div>
					<div className="p-6 bg-gray-100">
						<div
							id="print-preview"
							className="mx-auto bg-white shadow-lg border border-gray-200 rounded-lg print-area overflow-hidden"
							style={{
								width: "100%",
								maxWidth: "1056px",
								aspectRatio: "11 / 8.5",
							}}
						>
							<div className="p-3 h-full">
								{viewMode === "day"
									? renderDailyContent()
									: renderWeeklyContent(false)}
							</div>
						</div>
					</div>
				</section>

				{editingCell && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
						<div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-lg font-semibold text-gray-900">
										Asignación manual
									</h3>
									<p className="text-sm text-gray-600">
										{taskById.get(editingCell.taskId)?.label || "Tarea"} —{" "}
										{formatDateHeading(editingCell.date)}
									</p>
								</div>
								<button
									type="button"
									onClick={closeEditCell}
									className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
								>
									Cerrar
								</button>
							</div>

							<div className="max-h-72 overflow-auto border border-gray-200 rounded-md p-3 space-y-2">
								{people
									.filter((p) => p.is_active)
									.map((person) => (
										<label
											key={person.id}
											className="flex items-center gap-2 text-sm text-gray-800"
										>
											<input
												type="checkbox"
												checked={selectedPeople.includes(person.id)}
												onChange={(e) => {
													setSelectedPeople((prev) =>
														e.target.checked
															? [...prev, person.id]
															: prev.filter((id) => id !== person.id),
													);
												}}
											/>
											{person.full_name}
										</label>
									))}
								{people.filter((p) => p.is_active).length === 0 && (
									<p className="text-sm text-gray-500">
										No hay personas activas.
									</p>
								)}
							</div>

							<div className="mt-5 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={closeEditCell}
									className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
									disabled={savingCell}
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={handleSaveCell}
									className="px-3 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
									disabled={savingCell}
								>
									{savingCell ? "Guardando..." : "Guardar"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
