import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

async function checkAuthStatus() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            document.getElementById('user-email').textContent = user.email;
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Fehler beim Überprüfen des Authentifizierungsstatus:', error.message);
    }
}

async function showContextMenu(event, todoId) {
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '4px';
    contextMenu.style.borderRadius = '10px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    contextMenu.style.zIndex = '1000';

    const { data: todo } = await supabase
        .from('todos')
        .select('status')
        .eq('id', todoId)
        .single();

    const statusButton = createContextMenuItem(
        todo.status ? 'Als unerledigt markieren' : 'Als erledigt markieren',
        () => toggleTodoStatus(todoId),
        todo.status ? 'fa-solid fa-minus-square' : 'fa-solid fa-check-square'
    );
    const editButton = createContextMenuItem('Bearbeiten', () => editTodo(todoId), 'fa-solid fa-edit');
    const deleteButton = createContextMenuItem('Löschen', () => deleteTodo(todoId), 'fa-solid fa-trash');


    contextMenu.appendChild(statusButton);
    contextMenu.appendChild(editButton);
    contextMenu.appendChild(deleteButton);

    document.body.appendChild(contextMenu);
    document.addEventListener('click', removeContextMenu);
}

async function toggleTodoStatus(id) {
    try {
        const { data: todo } = await supabase
            .from('todos')
            .select('status')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('todos')
            .update({ status: !todo.status })
            .eq('id', id);

        if (error) throw error;

        showNotification('Status erfolgreich geändert');
        loadTodos(currentFilter, document.getElementById('search-table-input').value);
    } catch (error) {
        console.error('Fehler beim Ändern des Status:', error.message);
        showNotification('Fehler beim Ändern des Status');
    }
}

// Helper function to create context menu items
function createContextMenuItem(text, onClick, iconClass) {
    const button = document.createElement('button');
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.width = '100%';
    button.style.padding = '8px';
    button.style.textAlign = 'left';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.backgroundColor = 'transparent';
    button.style.color = 'black';
    button.style.cursor = 'pointer';
    button.onmouseover = () => button.style.backgroundColor = '#e9e9e9';
    button.onmouseout = () => button.style.backgroundColor = 'transparent';

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.marginRight = '8px';
    icon.style.width = '20px';
    icon.style.textAlign = 'center';

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    button.appendChild(icon);
    button.appendChild(textSpan);
    button.onclick = onClick;

    return button;
}

// Function to remove the context menu
function removeContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    document.removeEventListener('click', removeContextMenu);
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showNotification('Erfolgreich abgemeldet');
        window.location.href = 'index.html';
    } catch (error) {
        showNotification('Fehler beim Abmelden: ' + error.message);
    }
}

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

let currentFilter = 'alle';

async function loadTodos(filter = 'alle', searchQuery = '') {
    try {
        let query = supabase.from('todos').select('*');

        if (filter === 'offen') {
            query = query.eq('status', false);
        } else if (filter === 'erledigt') {
            query = query.eq('status', true);
        }

        if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const { data: todos, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        renderTodos(todos);
    } catch (error) {
        console.error('Fehler beim Laden der Todos:', error.message);
        showNotification('Fehler beim Laden der Todos. Bitte versuchen Sie es später erneut.');
    }
}

function renderTodos(todos) {
    const todoTable = document.getElementById('todo-tabelle').getElementsByTagName('tbody')[0];
    todoTable.innerHTML = '';
    
    todos.forEach(todo => {
        const row = todoTable.insertRow();
        row.innerHTML = `
            <td>${todo.name}</td>
            <td>${todo.description || ''}</td>
            <td>${todo.status ? 'Erledigt' : 'Offen'}</td>
            <td>${new Date(todo.created_at).toLocaleDateString()}</td>
        `;
        
        // Add right-click event listener
        row.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showContextMenu(event, todo.id);
        });
    });
}

async function saveTodo(event) {
    event.preventDefault();
    try {
        const formData = new FormData(document.getElementById('todo-form'));
        const todoData = {
            name: formData.get('name'),
            description: formData.get('description'),
            status: formData.get('status') === 'true'
        };

        const todoId = formData.get('id');
        let error;

        if (todoId) {
            const { error: updateError } = await supabase
                .from('todos')
                .update(todoData)
                .eq('id', todoId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('todos')
                .insert([todoData]);
            error = insertError;
        }

        if (error) throw error;

        document.getElementById('todo-modal').style.display = 'none';
        document.getElementById('todo-form').reset();
        showNotification('Aufgabe erfolgreich gespeichert');
        loadTodos(currentFilter, document.getElementById('search-table-input').value);
    } catch (error) {
        console.error('Fehler beim Speichern:', error.message);
        showNotification('Fehler beim Speichern der Aufgabe');
    }
}

async function editTodo(id) {
    try {
        const { data: todo, error } = await supabase
            .from('todos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('todo-id').value = todo.id;
        document.getElementById('name').value = todo.name;
        document.getElementById('description').value = todo.description || '';
        document.getElementById('status').value = todo.status.toString();
        document.getElementById('todo-modal').style.display = 'block';
    } catch (error) {
        console.error('Fehler beim Laden des Todos:', error.message);
        showNotification('Fehler beim Laden der Aufgabe');
    }
}

async function deleteTodo(id) {
    if (!confirm('Möchten Sie diese Aufgabe wirklich löschen?')) return;

    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Aufgabe erfolgreich gelöscht');
        loadTodos(currentFilter, document.getElementById('search-table-input').value);
    } catch (error) {
        console.error('Fehler beim Löschen:', error.message);
        showNotification('Fehler beim Löschen der Aufgabe');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);

    const modal = document.getElementById('todo-modal');
    const form = document.getElementById('todo-form');
    const addButton = document.getElementById('add-todo-button');
    const searchInput = document.getElementById('search-table-input');
    const filterButtons = document.querySelectorAll('.filter-button');

    addButton.onclick = () => {
        form.reset();
        document.getElementById('todo-id').value = '';
        modal.style.display = 'block';
    };

    modal.querySelector('.close').onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    searchInput.addEventListener('input', () => {
        loadTodos(currentFilter, searchInput.value);
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            loadTodos(currentFilter, searchInput.value);
        });
    });

    form.addEventListener('submit', saveTodo);
    window.editTodo = editTodo;
    window.deleteTodo = deleteTodo;

    loadTodos();
});