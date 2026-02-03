export const MY_TASKS_SELECT = `
        task:tasks (
          id,
          title,
          description,
          status,
          priority,
          due_date,
          project:projects (
            id,
            title,
            status
          )
        )
      `;
