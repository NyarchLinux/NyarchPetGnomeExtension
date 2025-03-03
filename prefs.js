// prefs.js
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class NyarchPetPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // The schema ID must match exactly with the one defined in your schema file
        const settings = this.getSettings('org.gnome.shell.extensions.nyarch-pet');
        
        // Create a preferences page
        const page = new Adw.PreferencesPage();
        page.set_title(_('Settings'));
        window.add(page);

        // Create a preferences group
        const group = new Adw.PreferencesGroup();
        group.set_title(_('Window Settings'));
        page.add(group);

        // Add entry for window title
        const windowTitleRow = new Adw.EntryRow({
            title: _('Target Window Title'),
            text: settings.get_string('target-window-title') || 'Your Target Window Title'
        });
        
        windowTitleRow.connect('changed', entry => {
            settings.set_string('target-window-title', entry.get_text());
        });
        
        group.add(windowTitleRow);
    }
}
