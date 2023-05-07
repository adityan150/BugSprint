import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Row } from "react-bootstrap";
import BoardSection from "../components/BoardSection";
import { gql, useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { DragDropContext } from "react-beautiful-dnd";
import { useSession } from "next-auth/react";
import { Task } from "../graphql/types";
import { assert } from "console";

const AllTasksQuery = gql`
  query {
    tasks {
      id
      title
      description
      status
    }
  }
`;

const GetUserQuery = gql`
  query ($email: String!) {
    user(email: $email) {
      id
      name
      tasks {
        id
        title
        description
        status
      }
    }
  }
`;

const UpdateTaskMutation = gql`
  mutation UpdateTaskMutation(
    $id: String!
    $title: String
    $description: String
    $userId: String
    $status: String
  ) {
    updateTask(
      description: $description
      id: $id
      title: $title
      userId: $userId
      status: $status
    ) {
      id
      title
      description
      status
    }
  }
`;

const Board = () => {
  const [tasks, setTasks] = useState([]);

  // All tasks query
  const { data, loading, error } = useQuery(AllTasksQuery, {
    onCompleted: (data) => {
      setTasks(data.tasks);
    },
  });

  const [updateTask] = useMutation(UpdateTaskMutation);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get user tasks query
  const [
    getTasks,
    { data: tasksData, loading: tasksLoading, error: tasksError },
  ] = useLazyQuery(GetUserQuery);

  const sections: Array<String> = ["Backlog", "In-Progress", "Review", "Done"];

  useEffect(() => {
    if (status === "authenticated") {
      getTasks({ variables: { email: session?.user?.email } });
    }
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session, router, getTasks]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId) {
      return;
    }

    const updatedTasksList =
      tasks &&
      tasks.map((t: any) => {
        if (t.id === draggableId) {
          return {
            ...t,
            status: destination.droppableId,
          };
        } else {
          return t;
        }
      });

    setTasks(updatedTasksList as any);

    updateTask({
      variables: {
        id: draggableId,
        status: destination.droppableId,
      },
      update: (cache, { data }) => {
        const existingTasks: any = cache.readQuery({
          query: AllTasksQuery,
        });

        const updatedTasks = existingTasks!.tasks.map((t: any) => {
          if (t.id === draggableId) {
            return {
              ...t,
              ...data!.updateTask!,
            };
          } else {
            return t;
          }
        });

        cache.writeQuery({
          query: AllTasksQuery,
          data: { tasks: updatedTasks },
        });
        const dataInCache = cache.readQuery({ query: AllTasksQuery });
        console.log("Cache: ", dataInCache);
      },
      onCompleted: (data) => {
        setTasks(data.tasks);
      },
    });
  };

  const reFetchTasks = () => {
    if (status === "authenticated" && session) {
      getTasks({ variables: { email: session?.user?.email } });
    }
  };

  return (
    <div className="pt-3 h-100 d-flex flex-column">
      <Row>
        <h2>Project BugSprint</h2>
      </Row>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-container d-flex flex-row flex-grow-1">
          {sections.map((section, index) => {
            let filteredData: Array<Task> = tasksData
              ? tasksData.user.tasks.filter(
                  (task: Task) => task.status === section
                )
              : [];
            return (
              <BoardSection
                title={section}
                key={index}
                tasks={filteredData}
                reFetchTasks={reFetchTasks}
              ></BoardSection>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Board;
