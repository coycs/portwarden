<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NIcon,
  NMessageProvider,
  NModal,
  NSpace,
  NSwitch,
  darkTheme,
  lightTheme,
  createDiscreteApi,
} from "naive-ui";
import {
  AppsOutline,
  CodeSlashOutline,
  CopyOutline,
  EyeOutline,
  EyeOffOutline,
  FolderOpenOutline,
  GlobeOutline,
  InformationCircleOutline,
  OpenOutline,
  PowerOutline,
  RefreshOutline,
  SearchOutline,
  ServerOutline,
  SettingsOutline,
  Star,
  StarOutline,
  SunnyOutline,
} from "@vicons/ionicons5";
import {
  FlexRender,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type SortingState,
} from "@tanstack/vue-table";
import { detectService } from "../shared/service-detection";
import type {
  PortProcessRecord,
  ResourceSample,
  ServiceRecord,
  ThemeMode,
  UserPreferences,
} from "../shared/types";
import portwardenLogoUrl from "./assets/portwarden-logo.png";
import SparkChart from "./components/SparkChart.vue";

const { t, locale } = useI18n();

type NavKey = "All" | "Dev Servers" | "Web" | "Databases" | "Favorites" | "Ignored";
type QuickFilter = "All" | "Listening" | "HTTP" | "Risk";

interface ServiceRow extends ServiceRecord {
  addressText: string;
  processName: string;
  pidText: string;
  statusText: string;
  serviceTypeLabel: string;
  frameworkLabel: string;
  riskLabel: string;
  riskNoteLabel: string;
  ignored: boolean;
}

const records = ref<PortProcessRecord[]>([]);
const selectedId = ref("");
const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const activeNav = ref<NavKey>("All");
const quickFilter = ref<QuickFilter>("All");
const sorting = ref<SortingState>([]);
const scanning = ref(false);
const refreshButtonLoading = ref(false);
const errorMessage = ref("");
const settingsVisible = ref(false);
const aboutVisible = ref(false);
const stopConfirmVisible = ref(false);
const stopSubmitting = ref(false);
const forceStopRequired = ref(false);
const pendingStopService = ref<ServiceRow | null>(null);
const favoriteIds = ref<Set<string>>(new Set());
const ignoredIds = ref<Set<string>>(new Set());
const preferences = ref<UserPreferences>({
  autoRefresh: true,
  refreshIntervalMs: 5000,
  locale: "zh-CN",
  themeMode: "system",
});
const resourceSamples = ref<Record<number, ResourceSample[]>>({});
const systemTheme = ref<Exclude<ThemeMode, "system">>(
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);
let refreshTimer: number | undefined;
let systemThemeQuery: MediaQueryList | undefined;

interface ScanOptions {
  showButtonLoading?: boolean;
  silent?: boolean;
}

const navItems = computed(() => [
  { label: t("nav.all"), value: "All" as const, icon: AppsOutline },
  { label: t("nav.devServers"), value: "Dev Servers" as const, icon: CodeSlashOutline },
  { label: t("nav.web"), value: "Web" as const, icon: GlobeOutline },
  { label: t("nav.databases"), value: "Databases" as const, icon: ServerOutline },
  { label: t("nav.favorites"), value: "Favorites" as const, icon: StarOutline },
  { label: t("nav.ignored"), value: "Ignored" as const, icon: EyeOffOutline },
]);

const services = computed<ServiceRow[]>(() =>
  records.value.map((record) => {
    const service = detectService(record);
    return {
      ...service,
      favorite: favoriteIds.value.has(service.id),
      ignored: ignoredIds.value.has(service.id),
      addressText: `${record.port.localAddress}:${record.port.port}`,
      processName: record.process?.name ?? t("common.unknown"),
      pidText: String(record.port.pid),
      statusText: record.port.state,
      serviceTypeLabel: serviceTypeLabel(service.type),
      frameworkLabel: frameworkLabel(service.framework),
      riskLabel: riskLabel(service.risk),
      riskNoteLabel: riskNoteLabel(service.risk),
    };
  }),
);

const filteredServices = computed(() => {
  const needle = query.value.trim().toLowerCase();

  return services.value.filter((service) => {
    const navMatch =
      activeNav.value === "All" ||
      (activeNav.value === "Favorites" && service.favorite) ||
      (activeNav.value === "Ignored" && service.ignored) ||
      service.port.localAddress === activeNav.value ||
      service.type === activeNav.value.toUpperCase().replace(" ", "_") ||
      (activeNav.value === "Dev Servers" && service.type === "DEV SERVER") ||
      (activeNav.value === "Databases" && service.type === "DATABASE") ||
      (activeNav.value === "Web" && service.type === "WEB");

    if (service.ignored && activeNav.value !== "Ignored") {
      return false;
    }

    const filterMatch =
      quickFilter.value === "All" ||
      (quickFilter.value === "Listening" && /listen/i.test(service.statusText)) ||
      (quickFilter.value === "HTTP" && [3000, 5173, 8000, 8080].includes(service.port.port)) ||
      (quickFilter.value === "Risk" && service.risk !== "Low");

    const searchMatch =
      !needle ||
      [
        service.port.port,
        service.addressText,
        service.processName,
        service.pidText,
        service.framework,
        service.process?.commandLine,
        service.process?.executablePath,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);

    return navMatch && filterMatch && searchMatch;
  });
});

const selectedService = computed(() => {
  return (
    services.value.find((service) => service.id === selectedId.value) ??
    filteredServices.value[0] ??
    services.value[0]
  );
});

const selectedSamples = computed(() => {
  const pid = selectedService.value?.port.pid;
  return pid ? (resourceSamples.value[pid] ?? []) : [];
});

const resolvedThemeMode = computed<Exclude<ThemeMode, "system">>(() =>
  preferences.value.themeMode === "system" ? systemTheme.value : preferences.value.themeMode,
);
const naiveTheme = computed(() => (resolvedThemeMode.value === "dark" ? darkTheme : null));
const discreteTheme = computed(() => (resolvedThemeMode.value === "dark" ? darkTheme : lightTheme));
const themeClass = computed(() => `theme-${resolvedThemeMode.value}`);
const nextThemeMode = computed<Exclude<ThemeMode, "system">>(() =>
  resolvedThemeMode.value === "dark" ? "light" : "dark",
);

const { message } = createDiscreteApi(["message"], {
  configProviderProps: computed(() => ({
    theme: discreteTheme.value,
  })),
});

const quickFilterItems = computed(() => [
  { label: t("filters.all"), value: "All" as const },
  { label: t("filters.listening"), value: "Listening" as const },
  { label: t("filters.http"), value: "HTTP" as const },
  { label: t("filters.risk"), value: "Risk" as const },
]);

const columnHelper = createColumnHelper<ServiceRow>();
const columns = [
  columnHelper.accessor((row) => row.port.port, {
    id: "port",
    header: () => t("table.port"),
  }),
  columnHelper.accessor((row) => row.port.protocol, {
    id: "protocol",
    header: () => t("table.protocol"),
  }),
  columnHelper.accessor("serviceTypeLabel", {
    header: () => t("table.service"),
  }),
  columnHelper.accessor("addressText", {
    header: () => t("table.address"),
  }),
  columnHelper.accessor("processName", {
    header: () => t("table.process"),
  }),
  columnHelper.accessor("pidText", {
    header: () => t("table.pid"),
  }),
  columnHelper.accessor("statusText", {
    header: () => t("table.status"),
  }),
];

const table = useVueTable({
  get data() {
    return filteredServices.value;
  },
  columns,
  state: {
    get sorting() {
      return sorting.value;
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === "function" ? updater(sorting.value) : updater;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});

watch(selectedService, (service) => {
  if (service && service.id !== selectedId.value) {
    selectedId.value = service.id;
  }
});

onMounted(async () => {
  startSystemThemeListener();
  window.addEventListener("keydown", handleGlobalKeydown);
  preferences.value = await window.portwarden.getPreferences();
  locale.value = preferences.value.locale;
  await scan({ showButtonLoading: true });
  scheduleRefresh();
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  window.removeEventListener("keydown", handleGlobalKeydown);
  stopSystemThemeListener();
});

watch(
  () => [preferences.value.autoRefresh, preferences.value.refreshIntervalMs],
  () => scheduleRefresh(),
);

watch(
  resolvedThemeMode,
  (mode) => {
    document.body.dataset.theme = mode;
  },
  { immediate: true },
);

async function scan(options: ScanOptions = {}): Promise<void> {
  if (scanning.value) {
    return;
  }

  scanning.value = true;
  refreshButtonLoading.value = Boolean(options.showButtonLoading);
  errorMessage.value = "";

  try {
    const result = await window.portwarden.scanPorts();
    if (result.ok) {
      records.value = result.records;
      captureResourceSamples(result.records);
      if (!selectedId.value && result.records[0]) {
        selectedId.value = result.records[0].port.id;
      }
      if (!options.silent) {
        message.success(t("app.scanComplete"));
      }
    } else {
      errorMessage.value = result.message;
      if (!options.silent) {
        message.error(`${t("app.scanFailed")}: ${result.message}`);
      }
    }
  } catch (error) {
    const fallbackMessage =
      error instanceof Error ? error.message : "Failed to scan Windows ports.";
    errorMessage.value = fallbackMessage;
    if (!options.silent) {
      message.error(`${t("app.scanFailed")}: ${fallbackMessage}`);
    }
  } finally {
    scanning.value = false;
    refreshButtonLoading.value = false;
  }
}

function captureResourceSamples(nextRecords: PortProcessRecord[]): void {
  const next = { ...resourceSamples.value };
  const activePids = new Set<number>();

  for (const record of nextRecords) {
    if (!record.process) continue;
    activePids.add(record.process.pid);
    const samples = next[record.process.pid] ?? [];
    const cpu = record.process.cpuPercent ?? samples.at(-1)?.cpuPercent ?? 0;
    const memory = record.process.memoryBytes ?? samples.at(-1)?.memoryBytes ?? 0;
    next[record.process.pid] = [
      ...samples,
      { at: Date.now(), cpuPercent: cpu, memoryBytes: memory },
    ].slice(-30);
  }

  for (const pidText of Object.keys(next)) {
    if (!activePids.has(Number(pidText))) {
      delete next[Number(pidText)];
    }
  }

  resourceSamples.value = next;
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  if (preferences.value.autoRefresh) {
    refreshTimer = window.setTimeout(() => {
      void scan({ showButtonLoading: true, silent: true }).finally(() => scheduleRefresh());
    }, preferences.value.refreshIntervalMs);
  }
}

async function updateAutoRefresh(value: boolean): Promise<void> {
  preferences.value = await window.portwarden.updatePreferences({ autoRefresh: value });
}

async function toggleTheme(): Promise<void> {
  preferences.value = await window.portwarden.updatePreferences({ themeMode: nextThemeMode.value });
}

async function updateThemeMode(mode: ThemeMode): Promise<void> {
  preferences.value = await window.portwarden.updatePreferences({ themeMode: mode });
}

function startSystemThemeListener(): void {
  systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemTheme.value = systemThemeQuery.matches ? "dark" : "light";
  systemThemeQuery.addEventListener("change", updateSystemTheme);
}

function stopSystemThemeListener(): void {
  systemThemeQuery?.removeEventListener("change", updateSystemTheme);
}

function updateSystemTheme(event: MediaQueryListEvent): void {
  systemTheme.value = event.matches ? "dark" : "light";
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.value?.focus();
    searchInput.value?.select();
  }
}

function toggleFavorite(service: ServiceRow): void {
  const next = new Set(favoriteIds.value);
  if (next.has(service.id)) {
    next.delete(service.id);
  } else {
    next.add(service.id);
  }
  favoriteIds.value = next;
}

function toggleIgnored(service: ServiceRow): void {
  const next = new Set(ignoredIds.value);
  if (next.has(service.id)) {
    next.delete(service.id);
  } else {
    next.add(service.id);
  }
  ignoredIds.value = next;
}

function serviceTypeLabel(type: string): string {
  const key = type.toLowerCase().replaceAll(" ", "_");
  return t(`serviceType.${key}`);
}

function frameworkLabel(framework: string): string {
  if (framework === "Local Service") {
    return t("framework.localService");
  }

  return framework;
}

function riskLabel(risk: ServiceRow["risk"]): string {
  return t(`risk.${risk.toLowerCase()}`);
}

function riskNoteLabel(risk: ServiceRow["risk"]): string {
  return risk === "Low" ? t("riskNote.localOnly") : t("riskNote.reviewExposure");
}

async function copy(value: string): Promise<void> {
  if (!value.trim()) {
    message.warning(t("common.nothingToCopy"));
    return;
  }

  const result = await window.portwarden.copyText(value);
  if (result.ok) {
    message.success(t("app.copied"));
  } else {
    message.error(result.message);
  }
}

async function openSelected(service: ServiceRow): Promise<void> {
  const host =
    service.port.localAddress === "0.0.0.0" || service.port.localAddress === "::"
      ? "127.0.0.1"
      : service.port.localAddress;
  const result = await window.portwarden.openExternal(`http://${host}:${service.port.port}`);
  if (result.ok) {
    message.success(t("app.opened"));
  } else {
    message.error(result.message);
  }
}

async function revealSelected(service: ServiceRow): Promise<void> {
  const path = service.process?.executablePath;
  if (!path) {
    message.warning(t("common.pathUnavailable"));
    return;
  }

  const result = await window.portwarden.revealPath(path);
  if (result.ok) {
    message.success(t("app.opened"));
  } else {
    message.error(result.message);
  }
}

function confirmStop(service: ServiceRow): void {
  pendingStopService.value = service;
  forceStopRequired.value = false;
  stopConfirmVisible.value = true;
}

async function executeStopProcess(force = false): Promise<void> {
  if (!pendingStopService.value || stopSubmitting.value) {
    return;
  }

  stopSubmitting.value = true;
  const service = pendingStopService.value;
  try {
    const result = await window.portwarden.stopProcess(service.port.pid, { force });
    if (result.ok) {
      message.success(t("app.stopProcess"));
      stopConfirmVisible.value = false;
      pendingStopService.value = null;
      forceStopRequired.value = false;
    } else {
      if (result.errorCode === "STOP_REQUIRES_FORCE") {
        forceStopRequired.value = true;
        return;
      }
      message.error(result.message);
    }
    await scan({ showButtonLoading: true, silent: true });
  } finally {
    stopSubmitting.value = false;
  }
}

function navCount(value: NavKey): number {
  if (value === "All") return services.value.filter((service) => !service.ignored).length;
  if (value === "Favorites")
    return services.value.filter((service) => service.favorite && !service.ignored).length;
  if (value === "Ignored") return services.value.filter((service) => service.ignored).length;
  if (value === "Dev Servers")
    return services.value.filter((service) => service.type === "DEV SERVER").length;
  if (value === "Databases")
    return services.value.filter((service) => service.type === "DATABASE").length;
  return services.value.filter((service) => service.type === "WEB").length;
}

function formatBytes(value?: number): string {
  if (!value) return "0 MB";
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as never) });
}
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <NDialogProvider>
        <main class="app-shell" :class="themeClass">
          <aside class="sidebar">
            <section class="brand">
              <div class="brand-mark">
                <img :src="portwardenLogoUrl" alt="" />
              </div>
              <div>
                <strong>{{ t("app.title") }}</strong>
                <span>{{ t("app.subtitle") }}</span>
              </div>
            </section>

            <nav class="nav-list">
              <button
                v-for="item in navItems"
                :key="item.value"
                class="nav-item"
                :class="{ active: activeNav === item.value }"
                @click="activeNav = item.value"
              >
                <NIcon :component="item.icon" :size="21" />
                <span>{{ item.label }}</span>
                <em>{{ navCount(item.value) }}</em>
              </button>
            </nav>

            <div class="sidebar-spacer" />

            <button class="nav-item subdued" @click="settingsVisible = true">
              <NIcon :component="SettingsOutline" :size="21" />
              <span>{{ t("nav.settings") }}</span>
            </button>
            <button class="nav-item subdued" @click="aboutVisible = true">
              <NIcon :component="InformationCircleOutline" :size="21" />
              <span>{{ t("nav.about") }}</span>
            </button>
          </aside>

          <section class="workspace">
            <header class="titlebar">
              <label class="search-box">
                <NIcon :component="SearchOutline" :size="19" />
                <input ref="searchInput" v-model="query" :placeholder="t('app.search')" />
                <kbd>Ctrl K</kbd>
              </label>

              <NSpace class="toolbar-actions" align="center" :size="10" :wrap="false">
                <NButton
                  :loading="refreshButtonLoading"
                  secondary
                  :render-icon="renderIcon(RefreshOutline)"
                  @click="scan({ showButtonLoading: true })"
                >
                  {{ t("app.refresh") }}
                </NButton>
                <div class="auto-toggle">
                  <span class="status-dot" />
                  <span>{{ t("app.autoRefresh") }}</span>
                  <NSwitch
                    :value="preferences.autoRefresh"
                    size="small"
                    @update:value="updateAutoRefresh"
                  />
                </div>
                <NButton secondary :render-icon="renderIcon(SunnyOutline)" @click="toggleTheme">
                  {{ resolvedThemeMode === "dark" ? t("app.lightTheme") : t("app.darkTheme") }}
                </NButton>
              </NSpace>
            </header>

            <section class="content-grid">
              <section class="port-list-panel">
                <div class="panel-heading">
                  <div>
                    <h1>{{ t("app.listeningPorts") }}</h1>
                    <span>{{ t("app.matchedServices", { count: filteredServices.length }) }}</span>
                  </div>
                  <div class="segmented">
                    <button
                      v-for="filter in quickFilterItems"
                      :key="filter.value"
                      :class="{ active: quickFilter === filter.value }"
                      @click="quickFilter = filter.value"
                    >
                      {{ filter.label }}
                    </button>
                  </div>
                </div>

                <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

                <div class="port-table">
                  <div
                    v-for="headerGroup in table.getHeaderGroups()"
                    :key="headerGroup.id"
                    class="table-row table-head"
                  >
                    <div v-for="header in headerGroup.headers" :key="header.id">
                      <button
                        v-if="!header.isPlaceholder"
                        @click="header.column.getToggleSortingHandler()?.($event)"
                      >
                        <FlexRender
                          :render="header.column.columnDef.header"
                          :props="header.getContext()"
                        />
                        <span v-if="header.column.getIsSorted() === 'asc'">↑</span>
                        <span v-else-if="header.column.getIsSorted() === 'desc'">↓</span>
                      </button>
                    </div>
                    <div>{{ t("table.actions") }}</div>
                  </div>

                  <button
                    v-for="row in table.getRowModel().rows"
                    :key="row.original.id"
                    class="table-row service-row"
                    :class="{ selected: selectedService?.id === row.original.id }"
                    @click="selectedId = row.original.id"
                  >
                    <div class="port-cell">
                      <button
                        class="favorite-button"
                        :class="{ active: row.original.favorite }"
                        :title="row.original.favorite ? t('app.unfavorite') : t('app.favorite')"
                        @click.stop="toggleFavorite(row.original)"
                      >
                        <NIcon :component="row.original.favorite ? Star : StarOutline" :size="19" />
                      </button>
                      <strong>{{ row.original.port.port }}</strong>
                    </div>
                    <div>{{ row.original.port.protocol }}</div>
                    <div>
                      <span class="tag" :class="row.original.tagTone">{{
                        row.original.serviceTypeLabel
                      }}</span>
                    </div>
                    <div class="mono">{{ row.original.addressText }}</div>
                    <div>
                      <strong>{{ row.original.processName }}</strong>
                      <span>{{ row.original.frameworkLabel }}</span>
                    </div>
                    <div class="mono">{{ row.original.pidText }}</div>
                    <div class="status-cell">
                      <span class="status-dot" />
                      <span>{{ row.original.statusText }}</span>
                    </div>
                    <div class="row-actions">
                      <NButton
                        quaternary
                        size="tiny"
                        :title="t('actions.open')"
                        :render-icon="renderIcon(OpenOutline)"
                        @click.stop="openSelected(row.original)"
                      />
                      <NButton
                        quaternary
                        size="tiny"
                        :title="t('actions.copy')"
                        :render-icon="renderIcon(CopyOutline)"
                        @click.stop="copy(row.original.addressText)"
                      />
                      <NButton
                        quaternary
                        size="tiny"
                        :title="t('actions.reveal')"
                        :render-icon="renderIcon(FolderOpenOutline)"
                        @click.stop="revealSelected(row.original)"
                      />
                      <NButton
                        quaternary
                        size="tiny"
                        :title="row.original.ignored ? t('actions.unignore') : t('actions.ignore')"
                        :render-icon="renderIcon(row.original.ignored ? EyeOutline : EyeOffOutline)"
                        @click.stop="toggleIgnored(row.original)"
                      />
                      <NButton
                        quaternary
                        size="tiny"
                        type="error"
                        :title="t('actions.stop')"
                        :render-icon="renderIcon(PowerOutline)"
                        @click.stop="confirmStop(row.original)"
                      />
                    </div>
                  </button>

                  <div v-if="table.getRowModel().rows.length === 0" class="empty-state">
                    {{ t("app.noResults") }}
                  </div>
                </div>
              </section>

              <aside v-if="selectedService" class="details-panel">
                <div class="details-header">
                  <div>
                    <span>{{ t("table.port") }}</span>
                    <h2>{{ selectedService.port.port }}</h2>
                  </div>
                </div>

                <section class="detail-section">
                  <h3>{{ t("details.serviceSummary") }}</h3>
                  <div class="detail-row">
                    <span>{{ t("details.serviceType") }}</span>
                    <strong
                      ><span class="tag" :class="selectedService.tagTone">{{
                        selectedService.serviceTypeLabel
                      }}</span></strong
                    >
                  </div>
                  <div class="detail-row">
                    <span>{{ t("table.address") }}</span>
                    <strong class="mono">{{ selectedService.addressText }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ t("table.status") }}</span>
                    <strong class="status-cell"
                      ><span class="status-dot" />{{ selectedService.statusText }}</strong
                    >
                  </div>
                  <div class="detail-row">
                    <span>{{ t("details.uptime") }}</span>
                    <strong>{{
                      new Date(selectedService.port.detectedAt).toLocaleTimeString()
                    }}</strong>
                  </div>
                </section>

                <section class="detail-section">
                  <h3>{{ t("details.processInfo") }}</h3>
                  <div class="detail-row">
                    <span>{{ t("table.process") }}</span>
                    <strong>{{ selectedService.processName }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>{{ t("table.pid") }}</span>
                    <strong class="mono">{{ selectedService.pidText }}</strong>
                  </div>
                  <div class="command-block">
                    <div class="command-label">
                      <span>{{ t("details.command") }}</span>
                      <NButton
                        quaternary
                        size="tiny"
                        :render-icon="renderIcon(CopyOutline)"
                        @click="copy(selectedService.process?.commandLine ?? '')"
                      />
                    </div>
                    <code>{{
                      selectedService.process?.commandLine ?? t("common.unavailable")
                    }}</code>
                  </div>
                  <div class="detail-row">
                    <span>{{ t("details.executable") }}</span>
                    <strong class="mono path-value">{{
                      selectedService.process?.executablePath ?? t("common.unavailable")
                    }}</strong>
                  </div>
                </section>

                <section class="detail-section">
                  <h3>{{ t("details.resourceUsage") }}</h3>
                  <div class="usage-row">
                    <span>{{ t("details.cpu") }}</span>
                    <strong>{{ selectedService.process?.cpuPercent ?? 0 }}%</strong>
                    <SparkChart :samples="selectedSamples" metric="cpu" color="#45d483" />
                  </div>
                  <div class="usage-row">
                    <span>{{ t("details.memory") }}</span>
                    <strong>{{ formatBytes(selectedService.process?.memoryBytes) }}</strong>
                    <SparkChart :samples="selectedSamples" metric="memory" color="#4aa3ff" />
                  </div>
                </section>

                <section class="detail-section risk-section">
                  <h3>{{ t("details.riskAssessment") }}</h3>
                  <div class="detail-row">
                    <span>{{ t("details.riskLevel") }}</span>
                    <strong
                      ><span class="risk-badge" :class="selectedService.risk.toLowerCase()">{{
                        selectedService.riskLabel
                      }}</span></strong
                    >
                  </div>
                  <div class="detail-row">
                    <span>{{ t("details.detectedAs") }}</span>
                    <strong>{{ selectedService.frameworkLabel }}</strong>
                  </div>
                  <p>{{ selectedService.riskNoteLabel }}</p>
                </section>

                <button class="stop-button" @click="confirmStop(selectedService)">
                  <NIcon :component="PowerOutline" :size="19" />
                  {{ t("app.stopProcess") }}
                </button>
              </aside>
            </section>
          </section>

          <NModal
            v-model:show="settingsVisible"
            preset="card"
            :title="t('settings.title')"
            class="modal-card"
          >
            <section class="settings-list">
              <div class="settings-row">
                <div>
                  <strong>{{ t("settings.theme") }}</strong>
                  <span>{{ t("settings.themeDescription") }}</span>
                </div>
                <div class="choice-group">
                  <button
                    :class="{ active: preferences.themeMode === 'system' }"
                    @click="updateThemeMode('system')"
                  >
                    {{ t("settings.system") }}
                  </button>
                  <button
                    :class="{ active: preferences.themeMode === 'light' }"
                    @click="updateThemeMode('light')"
                  >
                    {{ t("app.lightTheme") }}
                  </button>
                  <button
                    :class="{ active: preferences.themeMode === 'dark' }"
                    @click="updateThemeMode('dark')"
                  >
                    {{ t("app.darkTheme") }}
                  </button>
                </div>
              </div>
              <div class="settings-row">
                <div>
                  <strong>{{ t("app.autoRefresh") }}</strong>
                  <span>{{ t("settings.autoRefreshDescription") }}</span>
                </div>
                <NSwitch :value="preferences.autoRefresh" @update:value="updateAutoRefresh" />
              </div>
            </section>
          </NModal>

          <NModal
            v-model:show="aboutVisible"
            preset="card"
            :title="t('nav.about')"
            class="modal-card"
          >
            <section class="about-panel">
              <div class="about-brand">
                <img :src="portwardenLogoUrl" alt="" />
                <strong>PortWarden 0.1.1</strong>
              </div>
              <p>{{ t("about.description") }}</p>
              <p>{{ t("about.scope") }}</p>
            </section>
          </NModal>

          <NModal
            v-model:show="stopConfirmVisible"
            :mask-closable="!stopSubmitting"
            class="stop-confirm-modal"
          >
            <section v-if="pendingStopService" class="stop-confirm-panel">
              <header class="stop-confirm-header">
                <div>
                  <h2>{{ t("app.confirmStopTitle", { pid: pendingStopService.port.pid }) }}</h2>
                  <p>
                    {{
                      t("app.confirmStopContent", {
                        name: pendingStopService.processName,
                        port: pendingStopService.port.port,
                      })
                    }}
                  </p>
                </div>
              </header>
              <div class="stop-confirm-meta">
                <div>
                  <span>{{ t("table.process") }}</span>
                  <strong>{{ pendingStopService.processName }}</strong>
                </div>
                <div>
                  <span>{{ t("table.address") }}</span>
                  <strong class="mono">{{ pendingStopService.addressText }}</strong>
                </div>
              </div>
              <div v-if="forceStopRequired" class="force-stop-warning">
                <strong>{{ t("app.forceStopRequiredTitle") }}</strong>
                <span>{{ t("app.forceStopRequiredContent") }}</span>
              </div>
              <div class="stop-confirm-actions">
                <NButton :disabled="stopSubmitting" @click="stopConfirmVisible = false">
                  {{ t("app.cancel") }}
                </NButton>
                <NButton
                  v-if="forceStopRequired"
                  type="error"
                  :loading="stopSubmitting"
                  :render-icon="renderIcon(PowerOutline)"
                  @click="executeStopProcess(true)"
                >
                  {{ t("app.forceStop") }}
                </NButton>
                <NButton
                  v-else
                  type="error"
                  :loading="stopSubmitting"
                  :render-icon="renderIcon(PowerOutline)"
                  @click="executeStopProcess(false)"
                >
                  {{ t("app.confirm") }}
                </NButton>
              </div>
            </section>
          </NModal>
        </main>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
