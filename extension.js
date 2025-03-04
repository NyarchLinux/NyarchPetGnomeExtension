// extension.js
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

export default class NyarchPetExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._windowCreatedId = null;
        this._targetWindowTitle = "";
        this._settings = null;
        this._dbus = null;
        this._dbusId = null;
        this._busName = null;
        this._objectPath = null;
    }

    enable() {
        // Get settings
        this._settings = this.getSettings('org.gnome.shell.extensions.nyarch-pet');
        this._targetWindowTitle = this._settings.get_string('target-window-title');
        
        // Watch for settings changes
        this._settingsChangedId = this._settings.connect('changed::target-window-title', () => {
            this._targetWindowTitle = this._settings.get_string('target-window-title');
            this._log(`Target window title updated to: "${this._targetWindowTitle}"`);
        });
        
        this._log(`Extension enabled. Target window title: "${this._targetWindowTitle}"`);
        
        // Connect to window-created signal
        this._windowCreatedId = global.display.connect(
            'window-created',
            this._onWindowCreated.bind(this)
        );

        // Initialize D-Bus Portal
        this._dbusId = this.metadata.uuid.replace(/[^a-zA-Z0-9_]/g, '_');
        const BusName = `org.gnome.Shell.Extensions.${this._dbusId}`;
        const ObjectPath = `/org/gnome/Shell/Extensions/${this._dbusId}`;
        
        const CursorPositionInterface = `
        <node>
          <interface name="${BusName}">
            <method name="GetPosition">
              <arg type="a{sv}" direction="out" name="position"/>
            </method>
          </interface>
        </node>`;
        
        this._dbus = Gio.DBusExportedObject.wrapJSObject(CursorPositionInterface, this);
        
        try {
            this._dbus.export(Gio.DBus.session, ObjectPath);
            this._busName = BusName;
            this._objectPath = ObjectPath;
            this._log('D-Bus portal initialized at ' + ObjectPath);
        } catch (e) {
            this._log('Failed to export D-Bus object: ' + e.message);
            this._dbus = null;
        }
    }

    disable() {
        this._log('Extension disabled');
        
        // Disconnect from window-created signal
        if (this._windowCreatedId !== null) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = null;
        }
        
        // Disconnect from settings
        if (this._settingsChangedId !== null && this._settings !== null) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        // Unexport D-Bus portal
        if (this._dbus) {
            try {
                this._dbus.unexport();
                this._log('D-Bus portal unexported');
            } catch (e) {
                this._log('Error unexporting D-Bus object: ' + e.message);
            }
            this._dbus = null;
        }
        
        this._settings = null;
    }

    _onWindowCreated(display, window) {
        // Wait a moment for the window to initialize properly
        this._waitForWindow(window).then(win => {
            if (!win)
                return;
                
            const title = win.get_title();
            this._log(`Window created: "${title}"`);
            
            if (title && title.includes(this._targetWindowTitle)) {
                this._log(`Target window found: "${title}"`);
                
                
                // Remove window decorations (borders)
                win.unmaximize(Meta.MaximizeFlags.BOTH);
                // Make the window always on top
                win.make_above();
                // Make the window visible on every desktop
                win.stick();
                this._log('Applied always-on-top and borderless');
            }
        });
    }
    
    // Helper function to wait for window to be fully initialized
    async _waitForWindow(window) {
        // Maximum number of attempts
        const maxAttempts = 10;
        
        for (let i = 0; i < maxAttempts; i++) {
            if (window.get_title()) {
                return window;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this._log('Window initialization timed out');
        return null;
    }
    
    GetPosition() {
        // Get the current pointer position
        let [x, y] = global.get_pointer();
        
        // Log the position
        this._log(`Cursor position: x=${x}, y=${y}`);
        
        // Return as a dictionary with variant values
        return {
            'x': new GLib.Variant('i', x),
            'y': new GLib.Variant('i', y)
        };
    }
    
    _log(message) {
        if (this.metadata.debug)
            log(`[nyarch-pet] ${message}`);
    }
}
