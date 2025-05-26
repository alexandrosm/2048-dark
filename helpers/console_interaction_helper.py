import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

class ConsoleInteractionHelper:
    """Helper class for AI agents to interact with browser console via Vite plugin"""
    
    def __init__(self, command_file_path: str = './console-commands.json'):
        self.command_file_path = Path(command_file_path).resolve()
        
    def execute_command(self, code: str) -> Dict[str, Any]:
        """Execute JavaScript code in the browser console
        
        Args:
            code: JavaScript code to execute
            
        Returns:
            Command object with ID
        """
        command = {
            'id': f"cmd_{int(time.time() * 1000)}_{uuid.uuid4().hex[:9]}",
            'code': code,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
            'status': 'pending'
        }
        
        # Read existing commands
        commands = []
        if self.command_file_path.exists():
            with open(self.command_file_path, 'r') as f:
                commands = json.load(f)
        
        # Add new command
        commands.append(command)
        
        # Write back
        with open(self.command_file_path, 'w') as f:
            json.dump(commands, f, indent=2)
            
        return command
    
    def get_command_result(self, command_id: str, timeout: float = 5.0) -> Dict[str, Any]:
        """Get command result
        
        Args:
            command_id: Command ID to check
            timeout: Timeout in seconds
            
        Returns:
            Command with result
            
        Raises:
            TimeoutError: If command doesn't complete within timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                with open(self.command_file_path, 'r') as f:
                    commands = json.load(f)
                    
                command = next((c for c in commands if c['id'] == command_id), None)
                
                if command and command['status'] != 'pending':
                    return command
                    
            except (FileNotFoundError, json.JSONDecodeError):
                pass
                
            time.sleep(0.1)
            
        raise TimeoutError(f"Command {command_id} timed out")
    
    def execute_and_wait(self, code: str, timeout: float = 5.0) -> Any:
        """Execute command and wait for result
        
        Args:
            code: JavaScript code to execute
            timeout: Timeout in seconds
            
        Returns:
            Command result
            
        Raises:
            RuntimeError: If command execution fails
            TimeoutError: If command doesn't complete within timeout
        """
        command = self.execute_command(code)
        result = self.get_command_result(command['id'], timeout)
        
        if result.get('error'):
            raise RuntimeError(f"Command failed: {result['error']}")
            
        return result.get('result')
    
    def read_console_logs(self, log_file_path: str = './sentry-console-logs.json') -> List[Dict[str, Any]]:
        """Read the latest console logs
        
        Args:
            log_file_path: Path to log file
            
        Returns:
            List of console log entries
        """
        log_path = Path(log_file_path).resolve()
        
        if not log_path.exists():
            return []
            
        try:
            with open(log_path, 'r') as f:
                data = json.load(f)
                
            # Filter for console logs only
            return [log for log in data['logs'] if log['type'] == 'console']
            
        except (json.JSONDecodeError, KeyError):
            return []
    
    def read_errors(self, log_file_path: str = './sentry-console-logs.json') -> List[Dict[str, Any]]:
        """Read Sentry errors from logs
        
        Args:
            log_file_path: Path to log file
            
        Returns:
            List of Sentry error entries
        """
        log_path = Path(log_file_path).resolve()
        
        if not log_path.exists():
            return []
            
        try:
            with open(log_path, 'r') as f:
                data = json.load(f)
                
            # Filter for Sentry errors
            errors = []
            for log in data['logs']:
                if log['type'] == 'sentry':
                    for item in log['data'].get('items', []):
                        if item.get('body', {}).get('level') == 'error':
                            errors.append(log)
                            
            return errors
            
        except (json.JSONDecodeError, KeyError):
            return []
    
    # Convenience methods for common operations
    
    def get_page_title(self) -> str:
        """Get the current page title"""
        return self.execute_and_wait('document.title')
    
    def get_url(self) -> str:
        """Get the current page URL"""
        return self.execute_and_wait('window.location.href')
    
    def query_selector(self, selector: str) -> Optional[Dict[str, Any]]:
        """Query for an element and get its properties"""
        code = f"""
        (() => {{
            const el = document.querySelector('{selector}');
            if (!el) return null;
            return {{
                tagName: el.tagName,
                textContent: el.textContent,
                innerHTML: el.innerHTML,
                id: el.id,
                className: el.className,
                attributes: Array.from(el.attributes).reduce((acc, attr) => {{
                    acc[attr.name] = attr.value;
                    return acc;
                }}, {{}})
            }};
        }})()
        """
        return self.execute_and_wait(code)
    
    def click_element(self, selector: str) -> bool:
        """Click an element"""
        code = f"""
        (() => {{
            const el = document.querySelector('{selector}');
            if (!el) return false;
            el.click();
            return true;
        }})()
        """
        return self.execute_and_wait(code)
    
    def set_input_value(self, selector: str, value: str) -> bool:
        """Set input field value"""
        code = f"""
        (() => {{
            const el = document.querySelector('{selector}');
            if (!el) return false;
            el.value = '{value}';
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
            return true;
        }})()
        """
        return self.execute_and_wait(code)


# Example usage for AI agents
if __name__ == '__main__':
    helper = ConsoleInteractionHelper()
    
    try:
        # Get page information
        title = helper.get_page_title()
        print(f"Page title: {title}")
        
        # Query DOM
        h1_element = helper.query_selector('h1')
        if h1_element:
            print(f"H1 text: {h1_element['textContent']}")
        
        # Check for errors
        errors = helper.read_errors()
        if errors:
            print(f"Found {len(errors)} errors")
            
        # Read console logs
        console_logs = helper.read_console_logs()
        print(f"Console has {len(console_logs)} log entries")
        
        # Execute custom code
        button_count = helper.execute_and_wait(
            'document.querySelectorAll("button").length'
        )
        print(f"Page has {button_count} buttons")
        
    except Exception as e:
        print(f"Error: {e}")