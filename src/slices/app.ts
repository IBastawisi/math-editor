import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Announcement } from '../components/Announcer';
import { OutputData } from '@editorjs/editorjs';
import { validate } from 'uuid';

export interface AppState {
  announcement: Announcement | null;
  editor: EditorDocument;
  documents: string[];
  ui: {
    isLoading: boolean;
    isSaving: boolean;
  };
  config: {
    author?: string;
    defaultAlignment: string;
  };
}

export interface EditorDocument {
  id: string;
  name: string;
  author?: string;
  data: OutputData;
  timestamp: number;
}

const initialState: AppState = {
  announcement: null,
  editor: {} as EditorDocument,
  documents: [] as string[],
  ui: {
    isLoading: true,
    isSaving: false,
  },
  config: {
    defaultAlignment: 'left',
  },
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    load: (state) => {
      state.documents = Object.keys({ ...localStorage }).filter((key: string) => validate(key));
      state.editor = JSON.parse(localStorage.getItem('editor') || '{}');
      const localConfig = localStorage.getItem('config')
      state.config = localConfig ? JSON.parse(localConfig) : initialState.config;
      state.ui.isLoading = false;
      state.announcement = null;
    },
    loadDocument: (state, action: PayloadAction<EditorDocument>) => {
      state.editor = action.payload;
      window.localStorage.setItem("editor", JSON.stringify(action.payload));
      !state.documents.includes(action.payload.id) && state.documents.push(action.payload.id);
    },
    saveDocument: (state, action: PayloadAction<OutputData>) => {
      state.editor.data = action.payload;
      window.localStorage.setItem("editor", JSON.stringify(state.editor));
      window.localStorage.setItem(state.editor.id, JSON.stringify(state.editor));
    },
    addDocument: (state, action: PayloadAction<EditorDocument>) => {
      window.localStorage.setItem(action.payload.id, JSON.stringify(action.payload));
      !state.documents.includes(action.payload.id) && state.documents.push(action.payload.id);
    },
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter(key => key !== action.payload);
      window.localStorage.removeItem(action.payload);
    },
    announce: (state, action: PayloadAction<Announcement>) => {
      state.announcement = action.payload
    },
    clearAnnouncement: (state) => {
      state.announcement = null
    },
    setConfig: (state, action: PayloadAction<{ defaultAlignment: string }>) => {
      state.config = action.payload;
      window.localStorage.setItem("config", JSON.stringify(state.config));
    }
  },
});

export default appSlice.reducer;