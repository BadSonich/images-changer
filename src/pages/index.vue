<script setup lang="ts">
import {computed, ref, onMounted, onUnmounted} from 'vue';

type MediaType = {
  path: string | null;
  hoursStart: string | null;
  minutesStart: string | null;
  hoursEnd: string | null;
  minutesEnd: string | null;
  weekDays: number[] | null;
};

const imagesKey = 'imagesData';
const daysOfWeek = [
  { text: 'Понедельник', shortText: 'Пн', value: 1 },
  { text: 'Вторник', shortText: 'Вт', value: 2 },
  { text: 'Среда', shortText: 'Ср', value: 3 },
  { text: 'Четверг', shortText: 'Чт', value: 4 },
  { text: 'Пятница', shortText: 'Пт', value: 5 },
  { text: 'Суббота', shortText: 'Сб', value: 6 },
  { text: 'Воскресенье', shortText: 'Вс', value: 7 }
];
const hours = Array.from({length: 24}, (_, i) => ({
  text: i.toString().padStart(2, '0'),
  value: i
}));
const minutes = Array.from({length: 60}, (_, i) => ({
  text: i.toString().padStart(2, '0'),
  value: i
}));

const settingsDialog = ref<boolean>(false);
const addDialog = ref<boolean>(false);
const editingMedia = ref<MediaType>({
  path: null,
  hoursStart: null,
  minutesStart: null,
  hoursEnd: null,
  minutesEnd: null,
  weekDays: null,
});
const currentMedia = ref<MediaType | null>(null);
const editingIndex = ref<number | null>(null);

// Новые реактивные данные
const mediaList = ref<MediaType[]>([]);
let mediaCheckInterval: number | null = null;

// Инициализация localStorage
function initializeLocalStorage() {
  const existingData = localStorage.getItem(imagesKey);
  if (!existingData) {
    localStorage.setItem(imagesKey, JSON.stringify([]));
  }
}

// Загрузка медиа из localStorage
function loadMediaList() {
  try {
    const storedData = localStorage.getItem(imagesKey);
    if (storedData) {
      const loadedMedia = JSON.parse(storedData);
      mediaList.value = sortMediaList(loadedMedia);
    }
  } catch (error) {
    console.error('Ошибка загрузки медиа:', error);
    mediaList.value = [];
  }
}

// Получение текущего дня недели (1-7)
function getCurrentWeekDay(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Воскресенье = 7
}

// Получение текущего времени в секундах с начала дня
function getCurrentTimeInSeconds(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// Преобразование времени в секунды (для конца добавляем 59 секунд)
function timeToSeconds(hours: string | null, minutes: string | null, isEndTime: boolean = false): number {
  if (!hours || !minutes) return 0;
  const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60;
  // Для времени окончания добавляем 59 секунд, чтобы медиа отображалось до 23:59:59
  return isEndTime ? totalSeconds + 59 : totalSeconds;
}

// Проверка активности медиа
function isMediaActive(media: MediaType): boolean {
  if (!media.weekDays || !media.hoursStart || !media.minutesStart || !media.hoursEnd || !media.minutesEnd) {
    return false;
  }

  const currentDay = getCurrentWeekDay();
  const currentTime = getCurrentTimeInSeconds();

  const startTime = timeToSeconds(media.hoursStart, media.minutesStart, false);
  const endTime = timeToSeconds(media.hoursEnd, media.minutesEnd, true);

  const isDayMatch = media.weekDays.includes(currentDay);
  const isTimeMatch = currentTime >= startTime && currentTime <= endTime;

  return isDayMatch && isTimeMatch;
}

// Обновление текущего медиа
function updateCurrentMedia() {
  const activeMedia = mediaList.value.find(media => isMediaActive(media));
  currentMedia.value = activeMedia || null;
}

// Валидация временного интервала (учитываем, что конец может быть равен началу + 59 секунд)
function validateTimeInterval(): boolean {
  if (!editingMedia.value.hoursStart || !editingMedia.value.minutesStart ||
    !editingMedia.value.hoursEnd || !editingMedia.value.minutesEnd) {
    return false;
  }

  const startTime = timeToSeconds(editingMedia.value.hoursStart, editingMedia.value.minutesStart, false);
  const endTime = timeToSeconds(editingMedia.value.hoursEnd, editingMedia.value.minutesEnd, false);

  // Разрешаем интервалы где конец >= начало (даже если они равны - это будет 1 минута)
  return startTime <= endTime;
}

// Обновление функции проверки медиа для более точного интервала
function startMediaChecker() {
  updateCurrentMedia();

  // Проверяем каждую секунду для более точного переключения
  mediaCheckInterval = setInterval(() => {
    const now = new Date();
    const seconds = now.getSeconds();

    // Проверяем текущее медиа каждую секунду
    updateCurrentMedia();
  }, 1000);
}

// Проверка на дубликаты
function hasDuplicateMedia(): boolean {
  return mediaList.value.some((media, index) => {
    if (editingIndex.value !== null && index === editingIndex.value) {
      return false; // Пропускаем текущий редактируемый элемент
    }
    return media.path === editingMedia.value.path &&
      media.hoursStart === editingMedia.value.hoursStart &&
      media.minutesStart === editingMedia.value.minutesStart;
  });
}

// Функция для сортировки медиа по дням недели и времени
function sortMediaList(mediaArray: MediaType[]): MediaType[] {
  return [...mediaArray].sort((a, b) => {
    // Сначала сравниваем по минимальному дню недели
    const aMinDay = a.weekDays && a.weekDays.length > 0 ? Math.min(...a.weekDays) : 8;
    const bMinDay = b.weekDays && b.weekDays.length > 0 ? Math.min(...b.weekDays) : 8;

    if (aMinDay !== bMinDay) {
      return aMinDay - bMinDay;
    }

    // Если дни одинаковые, сравниваем по времени начала
    const aStartTime = timeToSeconds(a.hoursStart, a.minutesStart);
    const bStartTime = timeToSeconds(b.hoursStart, b.minutesStart);

    return aStartTime - bStartTime;
  });
}

// Получение отображаемого списка медиа (отсортированного)
const displayMediaList = computed(() => {
  const sortedList = sortMediaList(mediaList.value);

  return sortedList.map((media, index) => ({
    ...media,
    index: mediaList.value.indexOf(media), // Сохраняем оригинальный индекс для операций
    weekDaysText: media.weekDays
      ? media.weekDays
        .sort((a, b) => a - b)
        .map(day => daysOfWeek.find(d => d.value === day)?.shortText)
        .join(', ')
      : ''
  }));
});

// Существующие функции с добавленной логикой
function selectMedia() {
  window.electronAPI.selectFile().then((result) => {
    if (result.length > 0) {
      editingMedia.value.path = result;
    }
  })
}

function resetEditingMedia() {
  editingMedia.value = {
    path: null,
    hoursStart: null,
    minutesStart: null,
    hoursEnd: null,
    minutesEnd: null,
    weekDays: null,
  };
  editingIndex.value = null;
}

function closeAddModal() {
  addDialog.value = false;
  resetEditingMedia();
}

function editMedia(index: number) {
  const media = mediaList.value[index];
  if (media) {
    editingMedia.value = {
      path: media.path,
      hoursStart: media.hoursStart,
      minutesStart: media.minutesStart,
      hoursEnd: media.hoursEnd,
      minutesEnd: media.minutesEnd,
      weekDays: media.weekDays ? [...media.weekDays] : null,
    };
    editingIndex.value = index;
    addDialog.value = true;
  }
}

function addMedia() {
  if (
    !Boolean(editingMedia.value.path) ||
    !Boolean(editingMedia.value.hoursStart) ||
    !Boolean(editingMedia.value.minutesStart) ||
    !Boolean(editingMedia.value.hoursEnd) ||
    !Boolean(editingMedia.value.minutesEnd) ||
    !Boolean(editingMedia.value.weekDays)
  ) {
    return false;
  }

  // Дополнительная валидация
  if (!validateTimeInterval()) {
    alert('Время окончания должно быть больше времени начала!');
    return false;
  }

  if (hasDuplicateMedia()) {
    alert('Медиа с таким путем и временем начала уже существует!');
    return false;
  }

  try {
    if (editingIndex.value !== null) {
      // Редактирование существующего медиа
      mediaList.value[editingIndex.value] = { ...editingMedia.value };
    } else {
      // Добавление нового медиа
      mediaList.value.push({ ...editingMedia.value });
    }

    // Сортировка основного списка
    mediaList.value = sortMediaList(mediaList.value);

    // Сохранение в localStorage
    localStorage.setItem(imagesKey, JSON.stringify(mediaList.value));

    // Обновление текущего медиа
    updateCurrentMedia();

    // Закрытие модального окна
    closeAddModal();

    return true;
  } catch (error) {
    console.error('Ошибка сохранения медиа:', error);
    alert('Ошибка при сохранении медиа!');
    return false;
  }
}

function deleteMedia(index: number) {
  if (confirm('Вы уверены, что хотите удалить это медиа?')) {
    mediaList.value.splice(index, 1);
    // После удаления сохраняем отсортированный список
    mediaList.value = sortMediaList(mediaList.value);
    localStorage.setItem(imagesKey, JSON.stringify(mediaList.value));
    updateCurrentMedia();
  }
}

// Инициализация при монтировании
onMounted(() => {
  initializeLocalStorage();
  loadMediaList();
  startMediaChecker();
});

// Очистка при размонтировании
onUnmounted(() => {
  if (mediaCheckInterval) {
    clearInterval(mediaCheckInterval);
  }
});
</script>

<template>
  <v-container
    class="position-relative overflow-hidden pa-0 fill-height"
    max-width="100vw"
    max-height="100vh"
    fluid
  >
    <v-row
      class="fill-height ma-0 pa-0"
      align="end"
      justify="center"
    >
      <v-col
        class="pa-0 fill-height"
        cols="12"
      >
        <v-card
          class="d-flex flex-column justify-end"
          :image="currentMedia ? `file://${currentMedia.path}` : ''"
          height="100%"
        >
          <v-hover v-slot="{ isHovering, props }">
            <div
              class="mx-auto pa-0 d-flex"
              style="min-height: 40px; width: 100%"
              v-bind="props"
            >
              <v-slide-y-reverse-transition>
                <v-list
                  v-show="isHovering"
                  bg-color="grey-darken-4"
                  width="100%"
                >
                  <v-list-item>
                    <v-btn
                      icon="mdi-cog"
                      variant="tonal"
                      @click.stop="settingsDialog = true"
                    />
                  </v-list-item>
                </v-list>
              </v-slide-y-reverse-transition>
            </div>
          </v-hover>
        </v-card>
      </v-col>
    </v-row>

    <!--    settingsModal-->
    <v-dialog
      v-model="settingsDialog"
      width="500px"
      max-width="500px"
    >
      <v-card class="settings pa-2">
        <v-card-title class="px-2 d-flex align-center justify-space-between">
          <h3>Настройки</h3>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="settingsDialog = false"
          ></v-btn>
        </v-card-title>

        <v-card-item class="px-2">
          <v-col
            v-if="displayMediaList.length > 0"
            class="pa-0"
          >
            <h4>Текущие отображения</h4>
            <v-list class="media-list">
              <v-list-item
                v-for="media in displayMediaList"
                :key="`${media.path}-${media.hoursStart}-${media.minutesStart}`"
                min-height="36px"
                base-color="grey-lighten-3"
              >
                <div class="media-info">
                  <div class="media-path">{{ media.path }}</div>
                  <div class="media-time">
                    {{ media.hoursStart }}:{{ media.minutesStart }} -
                    {{ media.hoursEnd }}:{{ media.minutesEnd }}
                    ({{ media.weekDaysText }})
                  </div>
                </div>

                <v-list-item-action>
                  <v-btn
                    icon="mdi-pencil"
                    variant="text"
                    size="x-small"
                    @click.stop="editMedia(media.index)"
                  />
                  <v-btn
                    icon="mdi-trash-can-outline"
                    color="red"
                    variant="text"
                    size="x-small"
                    @click.stop="deleteMedia(media.index)"
                  />
                </v-list-item-action>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col v-else class="pa-0">
            <p>Нет добавленных медиа</p>
          </v-col>
        </v-card-item>

        <v-card-actions>
          <v-btn
            text="Добавить"
            color="blue-darken-1"
            variant="tonal"
            size="small"
            @click.stop="addDialog = true"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--    addModal-->
    <v-dialog
      v-model="addDialog"
      width="500px"
      max-width="500px"
    >
      <v-card class="add-modal pa-2">
        <v-card-title class="px-2 d-flex align-center justify-space-between">
          <h3>{{ editingIndex !== null ? 'Редактировать' : 'Добавить' }} отображение</h3>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeAddModal"
          ></v-btn>
        </v-card-title>

        <v-card-item class="px-2">
          <v-col
            v-if="true"
            class="pa-0"
          >
            <div class="pb-6 d-flex align-center">
              <v-chip
                class="long-chip pa-1 mr-2 text-body-1"
                label
                variant="text"
                color="grey-lighten-3"
              >
                {{ editingMedia.path ?? 'Выберите файл: ' }}
              </v-chip>

              <v-btn
                icon="mdi-file-plus"
                variant="tonal"
                size="small"
                color="grey-lighten-3"
                @click.stop="selectMedia()"
              />
            </div>
            <div>
              <v-select
                v-model="editingMedia.weekDays"
                :items="daysOfWeek"
                label="Дни недели"
                item-title="text"
                item-value="value"
                multiple
                closable-chips
                class="days-select"
              >
                <template v-slot:selection="{ item, index }">
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    color="light-blue-lighten-4"
                  >
                    <span>{{ item.raw.shortText }}</span>
                  </v-chip>
                </template>
              </v-select>
            </div>

            <div>
              <v-chip
                class="long-chip pa-1 mr-2 text-body-1"
                label
                variant="text"
                color="grey-lighten-3"
              >
                Выберите время начала:
              </v-chip>
              <v-row>
                <v-col class="pt-4 pb-0 pr-2" cols="6">
                  <v-select
                    v-model="editingMedia.hoursStart"
                    :items="hours"
                    label="Часы"
                    item-title="text"
                    item-value="value"
                  ></v-select>
                </v-col>
                <v-col class="pt-4 pb-0 pl-2" cols="6">
                  <v-select
                    v-model="editingMedia.minutesStart"
                    :items="minutes"
                    label="Минуты"
                    item-title="text"
                    item-value="value"
                  ></v-select>
                </v-col>
              </v-row>
            </div>
            <div class="pt-4">
              <v-chip
                class="long-chip pa-1 mr-2 text-body-1"
                label
                variant="text"
                color="grey-lighten-3"
              >
                Выберите время конца:
              </v-chip>
              <v-row>
                <v-col class="pt-4 pb-0 pr-2" cols="6">
                  <v-select
                    v-model="editingMedia.hoursEnd"
                    :items="hours"
                    label="Часы"
                    item-title="text"
                    item-value="value"
                  ></v-select>
                </v-col>
                <v-col class="pt-4 pb-0 pl-2" cols="6">
                  <v-select
                    v-model="editingMedia.minutesEnd"
                    :items="minutes"
                    label="Минуты"
                    item-title="text"
                    item-value="value"
                  ></v-select>
                </v-col>
              </v-row>
            </div>
          </v-col>
        </v-card-item>

        <v-card-actions>
          <v-btn
            :text="editingIndex !== null ? 'Обновить' : 'Сохранить'"
            color="blue-darken-1"
            variant="tonal"
            size="small"
            @click.stop="addMedia"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style lang="scss" scoped>
:deep(.v-responsive__content) {
  display: flex;
  align-items: end;
}

::v-deep(.settings) {
  .media-list {
    .v-list-item {
      padding: 0 12px !important;
    }

    .v-list-item__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .media-info {
      flex: 1;

      .media-path {
        font-size: 0.875rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .media-time {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }

  .v-card-actions {
    justify-content: start !important;
  }
}

::v-deep(.add-modal) {
  .long-chip {
    .v-chip__content {
      display: inline-block;
      max-width: 408px;
      width: 408px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .days-select {
    .v-field__input {
      padding-top: 30px;
    }
  }

  .v-card-actions {
    justify-content: start !important;
  }
}
</style>